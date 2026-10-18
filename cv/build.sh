#!/bin/sh
# Rebuilds the CV from resume_en.yaml: the PDF with RenderCV and the /cv/ page
set -e
cd "$(dirname "$0")"
uvx --from "rendercv[full]" rendercv render resume_en.yaml
cp rendercv_output/Bohdan_Barulin_CV.pdf ../site/
uv run page.py
