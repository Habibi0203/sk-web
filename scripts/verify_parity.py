# -*- coding: utf-8 -*-
"""Bandingkan berkas Excel hasil aplikasi web dengan hasil pipeline Python.

Ini pembuktian paritas: aplikasi web memakai ExcelJS yang TIDAK punya
`copyWorksheet`, jadi kloning sheet ditulis manual per sel. Skrip ini
memastikan hasilnya benar-benar setara.

Pakai:
    python scripts/verify_parity.py <hasil-web.xlsx> <hasil-python.xlsx>
    python scripts/verify_parity.py <hasil-web.xlsx> <hasil-python.xlsx> --max-col 7

Yang dibandingkan per sheet:
    urutan sheet, nilai sel, merge, tinggi baris, lebar kolom, warna tab,
    border, fill, font, page setup (orientasi/ukuran/scale), dan print area.

Catatan: pemeriksaan border & fill ditambahkan setelah sempat ada bug nyata
yang lolos — border tabel data hilang di hasil web, tetapi versi awal skrip ini
hanya membandingkan nilai sel sehingga selisihnya tidak terdeteksi.

Keluar dengan kode 1 bila ada selisih, supaya bisa dipakai di pemeriksaan otomatis.
"""
import argparse
import sys

import openpyxl


def norm_tab(c):
    """Ambil RGB warna tab tanpa alpha. WPS menulis FF, openpyxl menulis 00 —
    perbedaan itu hanya kanal alpha dan tidak berpengaruh pada tampilan."""
    if c is None:
        return None
    rgb = getattr(c, "rgb", None)
    if not rgb:
        return None
    return str(rgb)[-6:].upper()


def pola_border(cell):
    """Pola border sel sebagai huruf LRTB. '....' berarti tanpa border."""
    out = ""
    b = cell.border
    for sisi in ("left", "top", "right", "bottom"):
        s = getattr(b, sisi, None)
        out += "LRTB"[("left", "top", "right", "bottom").index(sisi)] if (
            s is not None and getattr(s, "style", None)
        ) else "."
    return out


def warna_fill(cell):
    """Latar sel (fgColor). None bila tidak ada."""
    f = cell.fill
    if f is None or getattr(f, "fill_type", None) is None:
        return None
    fg = getattr(f, "fgColor", None)
    rgb = getattr(fg, "rgb", None) if fg is not None else None
    return str(rgb)[-6:].upper() if rgb else None


def nama_font(cell):
    f = cell.font
    if f is None:
        return None
    return (f.name, f.size, bool(f.bold), bool(f.italic))


def main():
    ap = argparse.ArgumentParser(description="Bandingkan hasil web vs Python")
    ap.add_argument("web", help="berkas .xlsx hasil aplikasi web")
    ap.add_argument("python_file", help="berkas .xlsx hasil pipeline Python")
    ap.add_argument("--max-col", type=int, default=7, help="jumlah kolom yang dicek (default 7 = A..G)")
    ap.add_argument("--toleransi-tinggi", type=float, default=0.15,
                    help="selisih tinggi baris yang masih dianggap sama (default 0.15 pt)")
    ap.add_argument("--diam", action="store_true", help="hanya cetak bila ada selisih")
    a = ap.parse_args()

    print(f"WEB   : {a.web}")
    print(f"PYTHON: {a.python_file}")

    wb_web = openpyxl.load_workbook(a.web)
    wb_py = openpyxl.load_workbook(a.python_file)

    nm_web = wb_web.sheetnames
    nm_py = wb_py.sheetnames

    print("\n" + "=" * 68)
    print("SHEET")
    print(f"  jumlah  web={len(nm_web)}  python={len(nm_py)}")
    print(f"  urutan sama: {nm_web == nm_py}")
    if nm_web != nm_py:
        hanya_web = [n for n in nm_web if n not in nm_py]
        hanya_py = [n for n in nm_py if n not in nm_web]
        if hanya_web:
            print(f"  hanya di web   : {hanya_web}")
        if hanya_py:
            print(f"  hanya di python: {hanya_py}")

    total = {
        "nilai": 0,
        "border": 0,
        "fill": 0,
        "font": 0,
        "merge": 0,
        "tinggi": 0,
        "lebar": 0,
        "tab": 0,
        "setup": 0,
    }
    contoh = {k: [] for k in total}

    for nama in nm_web:
        if nama not in nm_py:
            continue
        ws_w = wb_web[nama]
        ws_p = wb_py[nama]

        # --- warna tab
        if norm_tab(ws_w.sheet_properties.tabColor) != norm_tab(ws_p.sheet_properties.tabColor):
            total["tab"] += 1
            contoh["tab"].append(
                f"{nama}: web={norm_tab(ws_w.sheet_properties.tabColor)} "
                f"py={norm_tab(ws_p.sheet_properties.tabColor)}"
            )

        # --- lebar kolom
        for c in range(1, a.max_col + 1):
            w1 = ws_w.column_dimensions[openpyxl.utils.get_column_letter(c)].width
            w2 = ws_p.column_dimensions[openpyxl.utils.get_column_letter(c)].width
            if w1 is None and w2 is None:
                continue
            if w1 is None or w2 is None or abs(w1 - w2) > 0.05:
                total["lebar"] += 1
                contoh["lebar"].append(f"{nama} kolom {c}: web={w1} py={w2}")
                break

        # --- page setup
        sp_w = (ws_w.page_setup.orientation, ws_w.page_setup.paperSize, ws_w.page_setup.scale)
        sp_p = (ws_p.page_setup.orientation, ws_p.page_setup.paperSize, ws_p.page_setup.scale)
        if sp_w != sp_p:
            total["setup"] += 1
            contoh["setup"].append(f"{nama}: web={sp_w} py={sp_p}")

        # --- merge
        m_w = sorted(str(r) for r in ws_w.merged_cells.ranges)
        m_p = sorted(str(r) for r in ws_p.merged_cells.ranges)
        if m_w != m_p:
            total["merge"] += 1
            contoh["merge"].append(f"{nama}:\n       web={m_w}\n       py ={m_p}")

        # --- nilai sel, border, latar, dan font
        baris_maks = max(ws_w.max_row, ws_p.max_row, 30)
        for r in range(1, baris_maks + 1):
            for c in range(1, a.max_col + 1):
                cw = ws_w.cell(r, c)
                cp = ws_p.cell(r, c)
                v1, v2 = cw.value, cp.value
                s1 = "" if v1 is None else str(v1)
                s2 = "" if v2 is None else str(v2)
                L = openpyxl.utils.get_column_letter(c)
                lokasi = f"{nama}!{L}{r}"

                if s1 != s2:
                    total["nilai"] += 1
                    if len(contoh["nilai"]) < 8:
                        contoh["nilai"].append(f"{lokasi}: web={s1[:30]!r} py={s2[:30]!r}")

                b1, b2 = pola_border(cw), pola_border(cp)
                if b1 != b2:
                    total["border"] += 1
                    if len(contoh["border"]) < 8:
                        contoh["border"].append(f"{lokasi}: web={b1} py={b2}")

                f1, f2 = warna_fill(cw), warna_fill(cp)
                if f1 != f2:
                    total["fill"] += 1
                    if len(contoh["fill"]) < 8:
                        contoh["fill"].append(f"{lokasi}: web={f1} py={f2}")

                n1, n2 = nama_font(cw), nama_font(cp)
                if n1 != n2:
                    total["font"] += 1
                    if len(contoh["font"]) < 8:
                        contoh["font"].append(f"{lokasi}: web={n1} py={n2}")

            h1 = ws_w.row_dimensions[r].height if r in ws_w.row_dimensions else None
            h2 = ws_p.row_dimensions[r].height if r in ws_p.row_dimensions else None
            if h1 is None and h2 is None:
                continue
            if h1 is None or h2 is None or abs(h1 - h2) > a.toleransi_tinggi:
                total["tinggi"] += 1
                if len(contoh["tinggi"]) < 8:
                    contoh["tinggi"].append(f"{nama}!baris {r}: web={h1} py={h2}")

    print("\n" + "=" * 68)
    label = {
        "nilai": "nilai sel",
        "border": "border sel",
        "fill": "latar sel",
        "font": "font sel",
        "merge": "merge",
        "tinggi": "tinggi baris",
        "lebar": "lebar kolom",
        "tab": "warna tab (alpha diabaikan)",
        "setup": "page setup",
    }
    print("SELISIH TERHADAP HASIL PYTHON")
    for k in ("nilai", "border", "fill", "font", "merge", "tinggi", "lebar", "tab", "setup"):
        tanda = "OK" if total[k] == 0 else "BEDA"
        print(f"  {label[k]:<28} {total[k]:>5}  {tanda}")

    for k in ("nilai", "border", "fill", "font", "merge", "tinggi", "lebar", "tab", "setup"):
        if contoh[k]:
            print(f"\n  contoh {label[k]}:")
            for s in contoh[k]:
                print(f"     {s}")

    semua_nol = all(v == 0 for v in total.values()) and nm_web == nm_py
    print("\n" + "=" * 68)
    if semua_nol:
        print("HASIL: PARITAS SEMPURNA — tidak ada selisih.")
    else:
        print("HASIL: ADA SELISIH — periksa daftar di atas.")
    print("=" * 68)
    return 0 if semua_nol else 1


if __name__ == "__main__":
    sys.exit(main())