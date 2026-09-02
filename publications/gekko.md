---
id: gekko-2026
title: "Revisiting Cross-View Completion: Self-Supervised Pre-Training via Reconstruction Error Comparison"
authors: "<a href='https://thibautloiseau.github.io/' target='_blank'><u>Thibaut Loiseau</u></a>, <a href='https://gbourmaud.github.io' target='_blank'>Guillaume Bourmaud</a>, <a href='https://vincentlepetit.github.io' target='_blank'>Vincent Lepetit</a>"
venue: "arXiv preprint"
year: 2026
thumbnail: "assets/images/publications/gekko-thumbnail.jpg"
links:
  paper: "arxiv.org/abs/2609.01530"
  code: "github.com/thibautloiseau/gekko"
  website: "projects/gekko/"
  checkpoints: "huggingface.co/thibautloiseau/gekko-vitl-500k"
  bibtex: "assets/bibtex/gekko-2026.bib"
---

Self-supervised pre-training via cross-view completion learns strong features for 3D vision from co-visible regions of image pairs. However, the reference view provides little information for reconstructing non-co-visible patches, implicitly yielding a monocular training signal in these regions. We introduce Gekko, which turns this limitation into a useful signal. The relative improvement of the cross-view reconstruction error over a masked-autoencoder error is a self-supervised proxy for co-visibility: large improvements indicate co-visible regions, negligible ones non-co-visible areas. Gekko is a network, trained from scratch, that jointly performs cross-view completion, masked autoencoding, and per-pixel prediction of this relative improvement, providing an additional binocular signal for all masked regions without any ground-truth 3D annotation. Under identical architectures and training data, Gekko consistently outperforms CroCo on zero-shot correspondence estimation, relative pose estimation, and pointmap regression, with up to 6× higher accuracy at the strictest relative-pose threshold and a 22% drop in end-point error on ETH3D. The extra channel it learns is itself a strong co-visibility detector on unseen scenes, and Gekko's frozen features outperform released cross-view backbones of comparable or larger size. It can also be trained directly from raw videos with a simple stride-based curriculum, removing the cumbersome 3D preprocessing prior methods require while matching models trained on curated data. Code and pre-trained models are publicly available.
