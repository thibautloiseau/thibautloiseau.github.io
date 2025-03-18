---
id: reliability-semantic-segmentation-2024
title: "Reliability in Semantic Segmentation: Can We Use Synthetic Data?"
authors: "Thibaut Loiseau, Tuan-Hung Vu, Mickael Chen, Patrick Pérez, and Matthieu Cord"
venue: "ECCV - Main Conference & Workshop"
year: 2024
thumbnail: "assets/images/publications/reliability-thumbnail.png"
links:
  paper: "arxiv.org/abs/2312.09231"
  code: "github.com/valeoai/GenVal"
  website: "valeoai.github.io/publications/genval/"
  data: "drive.google.com/drive/folders/1c3HthfWYrw_PEbf0eD2CRYp-xwYmxbLV"
  checkpoints: "drive.google.com/drive/folders/1BK1-I1uys0PN6U8KEVDjkLwMAQIbKJho"
  bibtex: "assets/bibtex/reliability-2024.bib"
---
Assessing the robustness of perception models to covariate shifts and their ability to detect out-of-distribution (OOD) inputs is crucial for safety-critical applications such as autonomous vehicles. By nature of such applications, however, the relevant data is difficult to collect and annotate. In this paper, we show for the first time how synthetic data can be specifically generated to assess comprehensively the real-world reliability of semantic segmentation models. By fine-tuning Stable Diffusion with only in-domain data, we perform zero-shot generation of visual scenes in OOD domains or inpainted with OOD objects. This synthetic data is employed to evaluate the robustness of pretrained segmenters, thereby offering insights into their performance when confronted with real edge cases. Through extensive experiments, we demonstrate a high correlation between the performance of models when evaluated on our synthetic OOD data and when evaluated on real OOD inputs, showing the relevance of such virtual testing. Furthermore, we demonstrate how our approach can be utilized to enhance the calibration and OOD detection capabilities of segmenters. Code and data are made public.