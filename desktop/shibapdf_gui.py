# -*- coding: utf-8 -*-
"""
PDF 对页/跨页 拆单页小工具
支持：
1. 拖拽或选择单个/多个 PDF 文件批量处理
2. 自定义四周出血裁切尺寸（默认 3mm，如 426x291mm -> 210x285mm）
3. 自动将拆分后的第 1 页（封底）移至最后一页（使封面排第 1 页、封底排末页）
4. 自动跳过本身已是竖版单页的页面（可选）
5. 100% 无损矢量、文字、CMYK 色彩与图片画质（不重压缩、不转曲栅格化）
"""

import ctypes
import os
import re
import subprocess
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from typing import List, Tuple

from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
    HAS_DND = True
except Exception:
    HAS_DND = False

MM_TO_PT = 72.0 / 25.4


def enable_high_dpi() -> None:
    """开启 Windows 高分屏清晰显示，避免界面文字发虚"""
    if sys.platform == "win32":
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass


def build_default_output_path(src_path: str) -> str:
    """根据原文件名智能生成输出单页 PDF 路径"""
    folder, filename = os.path.split(src_path)
    stem, ext = os.path.splitext(filename)
    if not ext:
        ext = ".pdf"

    patterns = [
        (r"\(对页\)", "(单页)"),
        (r"（对页）", "（单页）"),
        (r"\(跨页\)", "(单页)"),
        (r"（跨页）", "（单页）"),
        (r"对页", "单页"),
        (r"跨页", "单页"),
    ]
    new_stem = stem
    replaced = False
    for pat, rep in patterns:
        if re.search(pat, new_stem):
            new_stem = re.sub(pat, rep, new_stem, count=1)
            replaced = True
            break

    if not replaced:
        new_stem = f"{stem}(单页)"

    candidate = os.path.join(folder, f"{new_stem}{ext}")
    if os.path.normcase(os.path.abspath(candidate)) == os.path.normcase(os.path.abspath(src_path)):
        candidate = os.path.join(folder, f"{stem}_单页{ext}")
    return candidate


def inspect_pdf_summary(src_path: str, bleed_mm: float, remove_bleed: bool, move_first_to_last: bool, only_landscape: bool) -> str:
    """读取 PDF 第1页尺寸与总页数，生成实时预览说明"""
    reader = PdfReader(src_path)
    if reader.is_encrypted:
        reader.decrypt("")
    total = len(reader.pages)
    if total == 0:
        return "空 PDF 文件（0 页）"

    p0 = reader.pages[0]
    cb = p0.cropbox
    w_mm = abs(float(cb.right) - float(cb.left)) / MM_TO_PT
    h_mm = abs(float(cb.top) - float(cb.bottom)) / MM_TO_PT
    if p0.rotation % 180 != 0:
        w_mm, h_mm = h_mm, w_mm

    out_pages = 0
    for pg in reader.pages:
        c = pg.cropbox
        pw = abs(float(c.right) - float(c.left))
        ph = abs(float(c.top) - float(c.bottom))
        if pg.rotation % 180 != 0:
            pw, ph = ph, pw
        if (not only_landscape) or (pw > ph):
            out_pages += 2
        else:
            out_pages += 1

    if remove_bleed:
        single_w = w_mm / 2.0 - bleed_mm
        single_h = h_mm - 2.0 * bleed_mm
    else:
        single_w = w_mm / 2.0
        single_h = h_mm

    order_tip = "封面排第1页、封底移至末页" if move_first_to_last else "保持原左右拆分顺序"
    return (
        f"检测到共 {total} 页（首张尺寸 {w_mm:.1f} × {h_mm:.1f} mm）  ➜  "
        f"拆后共 {out_pages} 页，单页尺寸 {single_w:.1f} × {single_h:.1f} mm（{order_tip}）"
    )


def split_spread_pdf(
    src_path: str,
    out_path: str,
    bleed_mm: float = 3.0,
    remove_bleed: bool = True,
    move_first_to_last: bool = True,
    only_landscape: bool = True,
) -> Tuple[int, int, float, float]:
    """
    核心无损拆分函数
    返回：(原页数, 新页数, 单页宽mm, 单页高mm)
    """
    reader = PdfReader(src_path)
    if reader.is_encrypted:
        reader.decrypt("")

    src_count = len(reader.pages)
    if src_count == 0:
        raise ValueError("PDF 文件中没有页面。")

    b_pt = max(0.0, bleed_mm) * MM_TO_PT
    split_items = []  # List of (page_obj, main_rect, trim_rect)

    sample_w_mm = 0.0
    sample_h_mm = 0.0

    for pg in reader.pages:
        if pg.rotation % 360 != 0:
            pg.transfer_rotation_to_content()

        cb = pg.cropbox
        x0 = min(float(cb.left), float(cb.right))
        x1 = max(float(cb.left), float(cb.right))
        y0 = min(float(cb.bottom), float(cb.top))
        y1 = max(float(cb.bottom), float(cb.top))

        width = x1 - x0
        height = y1 - y0

        if only_landscape and width <= height:
            # 本身已是竖版单页，只按需裁四周出血或不裁
            if remove_bleed and width > 2 * b_pt and height > 2 * b_pt:
                r_single = RectangleObject((x0 + b_pt, y0 + b_pt, x1 - b_pt, y1 - b_pt))
            else:
                r_single = RectangleObject((x0, y0, x1, y1))
            t_single = RectangleObject((
                min(x0 + b_pt, x1),
                min(y0 + b_pt, y1),
                max(x1 - b_pt, x0),
                max(y1 - b_pt, y0),
            ))
            split_items.append((pg, r_single, t_single))
            continue

        mid_x = (x0 + x1) / 2.0
        left_trim = RectangleObject((x0 + b_pt, y0 + b_pt, mid_x, y1 - b_pt))
        right_trim = RectangleObject((mid_x, y0 + b_pt, x1 - b_pt, y1 - b_pt))

        if remove_bleed:
            left_main = left_trim
            right_main = right_trim
        else:
            left_main = RectangleObject((x0, y0, mid_x, y1))
            right_main = RectangleObject((mid_x, y0, x1, y1))

        if sample_w_mm == 0.0:
            sample_w_mm = (float(left_main.right) - float(left_main.left)) / MM_TO_PT
            sample_h_mm = (float(left_main.top) - float(left_main.bottom)) / MM_TO_PT

        split_items.append((pg, left_main, left_trim))
        split_items.append((pg, right_main, right_trim))

    # 将拆分后的第 1 页（通常为画册封底）移动到最后一页
    if move_first_to_last and len(split_items) >= 2:
        split_items = split_items[1:] + [split_items[0]]

    writer = PdfWriter()
    for orig_pg, main_rect, trim_rect in split_items:
        added = writer.add_page(orig_pg)
        added.mediabox = main_rect
        added.cropbox = main_rect
        added.bleedbox = main_rect
        added.trimbox = trim_rect
        added.artbox = trim_rect

    if sample_w_mm == 0.0 and len(writer.pages) > 0:
        c0 = writer.pages[0].cropbox
        sample_w_mm = (float(c0.right) - float(c0.left)) / MM_TO_PT
        sample_h_mm = (float(c0.top) - float(c0.bottom)) / MM_TO_PT

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "wb") as f:
        writer.write(f)

    return src_count, len(writer.pages), sample_w_mm, sample_h_mm


class PdfSplitterApp:
    def __init__(self, root: tk.Tk, initial_files: List[str]):
        self.root = root
        self.root.title("ShibaPDF — PDF 对页/跨页 拆单页工具")
        self.root.geometry("700x540")
        self.root.minsize(640, 500)
        self.root.configure(bg="#F5F7FA")

        self.files: List[str] = []
        self.last_output_path: str = ""

        # 绑定变量
        self.remove_bleed_var = tk.BooleanVar(value=True)
        self.bleed_mm_var = tk.StringVar(value="3")
        self.move_first_var = tk.BooleanVar(value=True)
        self.only_landscape_var = tk.BooleanVar(value=True)
        self.preview_text_var = tk.StringVar(value="请拖入或点击下方按钮添加对页 PDF 文件")

        self._build_ui()

        # 监听参数变化自动刷新尺寸预览
        self.remove_bleed_var.trace_add("write", lambda *_: self._refresh_preview())
        self.bleed_mm_var.trace_add("write", lambda *_: self._refresh_preview())
        self.move_first_var.trace_add("write", lambda *_: self._refresh_preview())
        self.only_landscape_var.trace_add("write", lambda *_: self._refresh_preview())

        if initial_files:
            self.add_files(initial_files)

    def _build_ui(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("vista")
        except Exception:
            pass

        # 顶部标题区
        header = tk.Frame(self.root, bg="#1E64D8", padx=20, pady=14)
        header.pack(fill="x")
        tk.Label(
            header,
            text="ShibaPDF · 对页拆单页工具",
            font=("Microsoft YaHei UI", 14, "bold"),
            fg="white",
            bg="#1E64D8",
        ).pack(anchor="w")
        tk.Label(
            header,
            text="无需 Acrobat · 100% 保留原矢量与 CMYK 印刷色彩 · 支持自动裁出血与封底归位",
            font=("Microsoft YaHei UI", 9),
            fg="#DCE8FF",
            bg="#1E64D8",
        ).pack(anchor="w", pady=(3, 0))

        main = tk.Frame(self.root, bg="#F5F7FA", padx=18, pady=14)
        main.pack(fill="both", expand=True)

        # 拖拽与文件列表区
        drop_frame = tk.LabelFrame(
            main,
            text=" 待处理 PDF 文件（支持直接把 PDF 拖入此窗口，可批量拖入多个） ",
            font=("Microsoft YaHei UI", 9, "bold"),
            bg="#FFFFFF",
            fg="#333333",
            padx=12,
            pady=10,
        )
        drop_frame.pack(fill="both", expand=True)

        list_container = tk.Frame(drop_frame, bg="#FFFFFF")
        list_container.pack(fill="both", expand=True)

        scrollbar = ttk.Scrollbar(list_container, orient="vertical")
        self.listbox = tk.Listbox(
            list_container,
            font=("Microsoft YaHei UI", 9),
            selectmode=tk.EXTENDED,
            yscrollcommand=scrollbar.set,
            bg="#FAFBFC",
            fg="#1F2937",
            relief="solid",
            bd=1,
            highlightthickness=0,
             height=6,
        )
        scrollbar.config(command=self.listbox.yview)
        self.listbox.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.listbox.bind("<<ListboxSelect>>", lambda *_: self._refresh_preview())

        if HAS_DND:
            for widget in (self.root, drop_frame, self.listbox):
                try:
                    widget.drop_target_register(DND_FILES)
                    widget.dnd_bind("<<Drop>>", self._on_drop)
                except Exception:
                    pass

        btn_row = tk.Frame(drop_frame, bg="#FFFFFF")
        btn_row.pack(fill="x", pady=(8, 0))
        ttk.Button(btn_row, text="＋ 选择 PDF 文件...", command=self._choose_files).pack(side="left")
        ttk.Button(btn_row, text="移除选中", command=self._remove_selected).pack(side="left", padx=8)
        ttk.Button(btn_row, text="清空列表", command=self._clear_files).pack(side="left")

        # 实时尺寸计算预览条
        preview_bar = tk.Frame(main, bg="#E8F0FE", padx=12, pady=8, bd=1, relief="solid")
        preview_bar.pack(fill="x", pady=(10, 10))
        tk.Label(
            preview_bar,
            textvariable=self.preview_text_var,
            font=("Microsoft YaHei UI", 9),
            fg="#174EA6",
            bg="#E8F0FE",
            anchor="w",
            justify="left",
            wraplength=630,
        ).pack(fill="x")

        # 参数设置区
        opts_frame = tk.LabelFrame(
            main,
            text=" 拆分与出血设置 ",
            font=("Microsoft YaHei UI", 9, "bold"),
            bg="#FFFFFF",
            fg="#333333",
            padx=14,
            pady=10,
        )
        opts_frame.pack(fill="x")

        row1 = tk.Frame(opts_frame, bg="#FFFFFF")
        row1.pack(fill="x", pady=2)
        tk.Checkbutton(
            row1,
            text="裁掉四周出血，直接输出净尺寸单页",
            variable=self.remove_bleed_var,
            font=("Microsoft YaHei UI", 9),
            bg="#FFFFFF",
            activebackground="#FFFFFF",
        ).pack(side="left")

        tk.Label(row1, text="   四周出血宽度：", font=("Microsoft YaHei UI", 9), bg="#FFFFFF").pack(side="left")
        bleed_entry = ttk.Entry(row1, textvariable=self.bleed_mm_var, width=6, justify="center")
        bleed_entry.pack(side="left")
        tk.Label(row1, text=" mm（默认 3mm）", font=("Microsoft YaHei UI", 9), fg="#666666", bg="#FFFFFF").pack(side="left")

        row2 = tk.Frame(opts_frame, bg="#FFFFFF")
        row2.pack(fill="x", pady=2)
        tk.Checkbutton(
            row2,
            text="将拆出的第 1 页自动移到最后一页（适用于首张跨页为“左封底 + 右封面”的画册）",
            variable=self.move_first_var,
            font=("Microsoft YaHei UI", 9),
            bg="#FFFFFF",
            activebackground="#FFFFFF",
        ).pack(side="left")

        row3 = tk.Frame(opts_frame, bg="#FFFFFF")
        row3.pack(fill="x", pady=2)
        tk.Checkbutton(
            row3,
            text="仅拆分横向跨页（若文档中混有竖版单页则自动保持单页不切半）",
            variable=self.only_landscape_var,
            font=("Microsoft YaHei UI", 9),
            bg="#FFFFFF",
            activebackground="#FFFFFF",
        ).pack(side="left")

        # 底部操作按钮区
        action_row = tk.Frame(main, bg="#F5F7FA")
        action_row.pack(fill="x", pady=(12, 0))

        self.open_folder_btn = ttk.Button(
            action_row,
            text="打开输出所在文件夹",
            command=self._open_last_folder,
            state="disabled",
        )
        self.open_folder_btn.pack(side="left")

        self.open_pdf_btn = ttk.Button(
            action_row,
            text="直接打开转换后的 PDF",
            command=self._open_last_pdf,
            state="disabled",
        )
        self.open_pdf_btn.pack(side="left", padx=8)

        self.run_btn = tk.Button(
            action_row,
            text="开始拆分为单页 PDF",
            command=self._run_split,
            font=("Microsoft YaHei UI", 10, "bold"),
            bg="#1E64D8",
            fg="white",
            activebackground="#154EB0",
            activeforeground="white",
            relief="flat",
            padx=22,
            pady=7,
            cursor="hand2",
        )
        self.run_btn.pack(side="right")

    def _get_bleed_mm(self) -> float:
        raw = self.bleed_mm_var.get().strip()
        if not raw:
            return 0.0
        return max(0.0, float(raw))

    def _on_drop(self, event) -> None:
        raw_paths = self.root.tk.splitlist(event.data)
        self.add_files(list(raw_paths))

    def _choose_files(self) -> None:
        paths = filedialog.askopenfilenames(
            title="选择对页/跨页 PDF 文件",
            filetypes=[("PDF 文件", "*.pdf *.PDF"), ("所有文件", "*.*")],
        )
        if paths:
            self.add_files(list(paths))

    def add_files(self, paths: List[str]) -> None:
        added_any = False
        existing_norm = {os.path.normcase(os.path.abspath(p)) for p in self.files}
        for p in paths:
            clean = p.strip().strip('"')
            if not clean or not os.path.isfile(clean):
                continue
            if not clean.lower().endswith(".pdf"):
                continue
            norm = os.path.normcase(os.path.abspath(clean))
            if norm not in existing_norm:
                self.files.append(clean)
                self.listbox.insert(tk.END, clean)
                existing_norm.add(norm)
                added_any = True

        if added_any:
            self._refresh_preview()

    def _remove_selected(self) -> None:
        sel = list(self.listbox.curselection())
        if not sel:
            return
        for idx in reversed(sel):
            self.listbox.delete(idx)
            del self.files[idx]
        self._refresh_preview()

    def _clear_files(self) -> None:
        self.listbox.delete(0, tk.END)
        self.files.clear()
        self._refresh_preview()

    def _refresh_preview(self) -> None:
        if not self.files:
            self.preview_text_var.set("请拖入或点击按钮添加对页 PDF 文件（转换结果默认保存在原文件同目录）")
            return

        sel = self.listbox.curselection()
        target = self.files[sel[0]] if sel else self.files[0]
        try:
            bleed_mm = self._get_bleed_mm()
        except ValueError:
            self.preview_text_var.set("出血宽度请输入有效数字（如 3 或 0）")
            return

        try:
            summary = inspect_pdf_summary(
                target,
                bleed_mm=bleed_mm,
                remove_bleed=self.remove_bleed_var.get(),
                move_first_to_last=self.move_first_var.get(),
                only_landscape=self.only_landscape_var.get(),
            )
            prefix = f"[共 {len(self.files)} 个文件] " if len(self.files) > 1 else ""
            self.preview_text_var.set(prefix + summary)
        except Exception as exc:
            self.preview_text_var.set(f"无法读取 PDF 预览信息：{exc}")

    def _run_split(self) -> None:
        if not self.files:
            messagebox.showwarning("提示", "请先拖入或选择至少一个 PDF 文件！")
            return

        try:
            bleed_mm = self._get_bleed_mm()
        except ValueError:
            messagebox.showerror("参数错误", "出血宽度请输入有效数字（例如 3 或 0）！")
            return

        remove_bleed = self.remove_bleed_var.get()
        move_first = self.move_first_var.get()
        only_landscape = self.only_landscape_var.get()

        results = []
        errors = []

        self.run_btn.config(state="disabled", text="正在转换中...")
        self.root.update_idletasks()

        try:
            for src in self.files:
                out_path = build_default_output_path(src)
                if os.path.exists(out_path):
                    ans = messagebox.askyesno(
                        "目标文件已存在",
                        f"输出文件已存在：\n{out_path}\n\n是否覆盖该文件？（选“否”将自动另存为新序号文件）",
                    )
                    if not ans:
                        base, ext = os.path.splitext(out_path)
                        k = 2
                        while os.path.exists(f"{base}_{k}{ext}"):
                            k += 1
                        out_path = f"{base}_{k}{ext}"

                try:
                    src_n, out_n, w_mm, h_mm = split_spread_pdf(
                        src_path=src,
                        out_path=out_path,
                        bleed_mm=bleed_mm,
                        remove_bleed=remove_bleed,
                        move_first_to_last=move_first,
                        only_landscape=only_landscape,
                    )
                    self.last_output_path = out_path
                    results.append((os.path.basename(out_path), src_n, out_n, w_mm, h_mm, out_path))
                except Exception as exc:
                    errors.append(f"{os.path.basename(src)}：{exc}")
        finally:
            self.run_btn.config(state="normal", text="开始拆分为单页 PDF")

        if self.last_output_path and os.path.exists(self.last_output_path):
            self.open_folder_btn.config(state="normal")
            self.open_pdf_btn.config(state="normal")

        if results and not errors:
            lines = [
                f"• {name}（{src_n}页 ➜ {out_n}页，{w_mm:.0f}×{h_mm:.0f}mm）"
                for name, src_n, out_n, w_mm, h_mm, _ in results
            ]
            msg = "全部转换成功！输出文件已保存在原 PDF 同目录下：\n\n" + "\n".join(lines[:8])
            if len(lines) > 8:
                msg += f"\n... 等共 {len(lines)} 个文件"
            messagebox.showinfo("转换完成", msg)
        elif results and errors:
            messagebox.showwarning(
                "部分完成",
                f"成功 {len(results)} 个，失败 {len(errors)} 个：\n\n" + "\n".join(errors),
            )
        else:
            messagebox.showerror("转换失败", "\n".join(errors))

    def _open_last_folder(self) -> None:
        if self.last_output_path and os.path.exists(self.last_output_path):
            subprocess.Popen(["explorer.exe", "/select,", os.path.normpath(self.last_output_path)])

    def _open_last_pdf(self) -> None:
        if self.last_output_path and os.path.exists(self.last_output_path):
            os.startfile(self.last_output_path)


def main() -> None:
    enable_high_dpi()
    cli_files = [arg for arg in sys.argv[1:] if os.path.isfile(arg) and arg.lower().endswith(".pdf")]
    root = TkinterDnD.Tk() if HAS_DND else tk.Tk()
    PdfSplitterApp(root, cli_files)
    root.mainloop()


if __name__ == "__main__":
    main()
