---
id: pom-2026
title: "PoM: A Linear-Time Replacement for Attention with the Polynomial Mixer"
authors: "<a href='https://davidpicard.github.io/' target='_blank'>David Picard</a>, <a href='https://nicolas-dufour.github.io/' target='_blank'>Nicolas Dufour</a>, <a href='https://lucasdegeorge.github.io/' target='_blank'>Lucas Degeorge</a>, <a href='https://arijit-hub.github.io/' target='_blank'>Arijit Ghosh</a>, <a href='https://davidea97.github.io/' target='_blank'>Davide Allegro</a>, Tom Ravaud, <a href='https://yohannperron.github.io/WebPage/' target='_blank'>Yohann Perron</a>, <a href='https://csautier.github.io/' target='_blank'>Corentin Sautier</a>, <a href='https://imagine.enpc.fr/~sonat.baltaci/' target='_blank'>Zeynep Sonat Baltaci</a>, <a href='https://imagine-lab.enpc.fr/staff-members/fei-meng/' target='_blank'>Fei Meng</a>, <a href='https://imagine-lab.enpc.fr/staff-members/syrine-kalleli/' target='_blank'>Syrine Kalleli</a>, <a href='https://imagine.enpc.fr/~marta.lopez-rauhut/' target='_blank'>Marta López-Rauhut</a>, <u>Thibaut Loiseau</u>, <a href='https://imagine-lab.enpc.fr/staff-members/segolene-albouy/' target='_blank'>Ségolène Albouy</a>, <a href='https://raphael-baena.github.io/' target='_blank'>Raphael Baena</a>, <a href='https://imagine.enpc.fr/~vincente/' target='_blank'>Elliot Vincent</a>, <a href='https://loiclandrieu.com/' target='_blank'>Loic Landrieu</a>"
venue: "CVPR - Findings"
year: 2026
thumbnail: "assets/images/publications/pom-thumbnail.png"
links:
  paper: "arxiv.org/abs/2604.06129"
  code: "github.com/davidpicard/pom"
  bibtex: "assets/bibtex/pom-2026.bib"
---
This paper introduces the Polynomial Mixer (PoM), a novel token mixing mechanism with linear complexity that serves as a drop-in replacement for self-attention. PoM aggregates input tokens into a compact representation through a learned polynomial function, from which each token retrieves contextual information. We prove that PoM satisfies the contextual mapping property, ensuring that transformers equipped with PoM remain universal sequence-to-sequence approximators. We replace standard self-attention with PoM across five diverse domains: text generation, handwritten text recognition, image generation, 3D modeling, and Earth observation. PoM matches the performance of attention-based models while drastically reducing computational cost when working with long sequences.
