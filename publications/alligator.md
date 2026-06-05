---
id: alligator-2025
title: "Alligat0R: Pre-Training through Co-Visibility Segmentation for Relative Camera Pose Regression"
authors: "<a href='https://thibautloiseau.github.io/' target='_blank'><u>Thibaut Loiseau</u></a>, <a href='https://gbourmaud.github.io' target='_blank'>Guillaume Bourmaud</a>, <a href='https://vincentlepetit.github.io' target='_blank'>Vincent Lepetit</a>"
venue: "NeurIPS - Main Conference <span style='color:red'>(Spotlight)</span>"
year: 2025
thumbnail: "assets/images/publications/alligator-thumbnail.jpg"
links:
  paper: "arxiv.org/abs/2503.07561"
  code: "github.com/thibautloiseau/alligat0r"
  website: "projects/alligator/"
  data: "huggingface.co/datasets/thibautloiseau/Cub3"
  checkpoints: "huggingface.co/thibautloiseau/alligat0r"
  bibtex: "assets/bibtex/alligator-2025.bib"
---
Pre-training techniques have greatly advanced computer vision, with CroCo's cross-view completion approach yielding impressive results in tasks like 3D reconstruction and pose regression. However, this method requires substantial overlap between training pairs, limiting its effectiveness. We introduce Alligat0R, a novel pre-training approach that reformulates cross-view learning as a co-visibility segmentation task. Our method predicts whether each pixel in one image is co-visible in the second image, occluded, or outside the field of view (FOV), enabling the use of image pairs with any degree of overlap and providing interpretable predictions. To support this, we present Cub3, a large-scale dataset with 2.5 million image pairs and dense co-visibility annotations derived from the nuScenes dataset. This dataset includes diverse scenarios with varying degrees of overlap. The experiments show that Alligat0R significantly outperforms CroCo in relative pose regression, especially in scenarios with limited overlap. Alligat0R and Cub3 will be made publicly available.