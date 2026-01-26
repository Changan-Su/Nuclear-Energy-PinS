document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Navigation Highlighting
    const navLinks = document.querySelectorAll('aside nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // e.preventDefault(); // Uncomment if using single page app logic
            
            // Remove active state from all
            navLinks.forEach(l => {
                l.classList.remove('bg-accent-blue', 'text-white');
                l.classList.add('text-text-muted', 'hover:bg-white/5');
                const icon = l.querySelector('i');
                if(icon) icon.classList.replace('text-white', 'text-gray-400');
            });

            // Add active state to clicked
            link.classList.remove('text-text-muted', 'hover:bg-white/5');
            link.classList.add('bg-accent-blue', 'text-white');
            const icon = link.querySelector('i');
            if(icon) icon.classList.replace('text-gray-400', 'text-white');
        });
    });

    // Mock "Add New" Button
    const addBtn = document.querySelector('button i[data-lucide="plus"]').parentElement;
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            alert("Open New Content Modal");
        });
    }
});
