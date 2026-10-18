#!/bin/sh
# Rebuilds site/Bohdan_Barulin_CV.pdf from resume_en.yaml with RenderCV
set -e
cd "$(dirname "$0")"
uvx --from "rendercv[full]==2.8" rendercv render resume_en.yaml
cp rendercv_output/Bohdan_Barulin_CV.pdf ../site/
