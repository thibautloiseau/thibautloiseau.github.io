document.addEventListener('DOMContentLoaded', async function() {
    const publicationsContainer = document.getElementById('publications-container');
    
    try {
        // Fetch the list of publication files
        const response = await fetch('assets/publications/list.json');
        const publicationFiles = await response.json();
        
        // Load each publication
        for (const file of publicationFiles) {
            const pubResponse = await fetch(`assets/publications/${file}`);
            const pubText = await pubResponse.text();
            
            // Parse the YAML frontmatter and markdown
            const publication = parsePublication(pubText);
            
            // Create and add the publication card
            const card = createPublicationCard(publication);
            publicationsContainer.appendChild(card);
        }
        
        // Add event listeners for abstracts
        addAbstractToggleListeners();
        
    } catch (error) {
        console.error('Error loading publications:', error);
        publicationsContainer.innerHTML = '<p>Error loading publications. Please try again later.</p>';
    }
});

// Parse the publication markdown with YAML frontmatter
function parsePublication(text) {
    const parts = text.split('---');
    if (parts.length < 3) {
        throw new Error('Invalid publication format');
    }
    
    const frontmatter = parts[1].trim();
    const abstract = parts[2].trim();
    
    // Parse YAML frontmatter
    const publication = {};
    frontmatter.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            
            // Handle nested objects (links)
            if (key === 'links') {
                publication.links = {};
            } else if (line.startsWith('  ') && publication.links) {
                const linkKey = line.trim().split(':')[0].trim();
                const linkValue = line.trim().split(':')[1].trim();
                publication.links[linkKey] = linkValue.replace(/"/g, '');
            } else {
                publication[key] = value.replace(/"/g, '');
            }
        }
    });
    
    // Add the abstract
    publication.abstract = abstract;
    
    return publication;
}

// Create a publication card from the parsed data
function createPublicationCard(pub) {
    const card = document.createElement('div');
    card.className = 'publication-card';
    card.id = pub.id;

    // Helper function to ensure URLs are absolute
    function ensureAbsoluteUrl(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return `${url}`;
        }
        return `https://${url}`;
    }

    card.innerHTML = `
        <div class="publication-image">
            <img src="${pub.thumbnail}" alt="${pub.title}">
        </div>
        <div class="publication-content">
            <h3 class="publication-title">${pub.title}</h3>
            <p class="publication-authors">${pub.authors}</p>
            <p class="publication-venue">${pub.venue}, ${pub.year}</p>
            <div class="publication-links">
                ${pub.links.paper ? `<a href="${ensureAbsoluteUrl(pub.links.paper)}" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-pdf"></i> Paper</a>` : ''}
                ${pub.links.code ? `<a href="${ensureAbsoluteUrl(pub.links.code)}" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-code"></i> Code</a>` : ''}
                ${pub.links.website ? `<a href="${ensureAbsoluteUrl(pub.links.website)}" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-globe"></i> Website</a>` : ''}
                ${pub.links.data ? `<a href="${ensureAbsoluteUrl(pub.links.data)}" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-database"></i> Data</a>` : ''}
                ${pub.links.checkpoints ? `<a href="${ensureAbsoluteUrl(pub.links.checkpoints)}" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-cube"></i> Checkpoints</a>` : ''}
                ${pub.links.bibtex ? `<a href="${pub.links.bibtex}" class="publication-link bibtex-link" data-bibtex="${pub.id}-bibtex"><i class="fas fa-quote-right"></i> BibTeX</a>` : ''}
            </div>
            <button class="show-abstract-btn" data-pub-id="${pub.id}">Show Abstract</button>
            <div class="publication-abstract" id="abstract-${pub.id}">${pub.abstract}</div>
        </div>
    `;
    
    return card;
}

// Add event listeners for abstract toggle buttons
function addAbstractToggleListeners() {
    document.querySelectorAll('.show-abstract-btn').forEach(button => {
        button.addEventListener('click', function() {
            const pubId = this.getAttribute('data-pub-id');
            const abstractElement = document.getElementById(`abstract-${pubId}`);
            
            if (abstractElement.style.display === 'block') {
                abstractElement.style.display = 'none';
                this.textContent = 'Show Abstract';
            } else {
                abstractElement.style.display = 'block';
                this.textContent = 'Hide Abstract';
            }
        });
    });
    
    // BibTeX popup functionality
    document.querySelectorAll('.bibtex-link').forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                const bibtexPath = this.getAttribute('href');
                const response = await fetch(bibtexPath);
                const bibtex = await response.text();
                
                // Create and show a modal with the BibTeX content
                showBibtexModal(bibtex);
            } catch (error) {
                console.error('Error loading BibTeX:', error);
                alert('Failed to load BibTeX. Please try again later.');
            }
        });
    });
}

// Function to show BibTeX in a modal
function showBibtexModal(bibtex) {
    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'bibtex-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bibtex-modal-content';
    modalContent.style.cssText = `
        background-color: white;
        padding: 20px;
        border-radius: 5px;
        width: 80%;
        max-width: 600px;
        max-height: 80%;
        overflow-y: auto;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        display: block;
        margin-top: 20px;
        padding: 8px 16px;
        background-color: #1a73e8;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    
    const pre = document.createElement('pre');
    pre.style.cssText = `
        white-space: pre-wrap;
        word-break: break-all;
        background-color: #f5f5f5;
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;
    `;
    pre.textContent = bibtex;
    
    // Add elements to the DOM
    modalContent.appendChild(pre);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listener to close the modal
    closeButton.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}