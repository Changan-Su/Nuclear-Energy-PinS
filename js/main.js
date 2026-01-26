document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => {
                t.classList.remove('bg-white', 'text-black');
                t.classList.add('bg-surface-dark', 'text-white');
            });

            // Add active class to clicked tab
            tab.classList.remove('bg-surface-dark', 'text-white');
            tab.classList.add('bg-white', 'text-black');

            // Hide all content
            contents.forEach(c => {
                c.classList.add('opacity-0', 'z-0');
                c.classList.remove('opacity-100', 'z-10');
            });

            // Show target content
            const targetId = `content-${tab.dataset.tab}`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('opacity-0', 'z-0');
                targetContent.classList.add('opacity-100', 'z-10');
            }
        });
    });

    // Closer Look Interactive List
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach(item => {
        item.addEventListener('click', () => {
            // Reset all items
            featureItems.forEach(i => {
                i.classList.remove('active', 'border-accent-blue');
                i.classList.add('border-black/10');
                
                const title = i.querySelector('h3');
                title.classList.remove('text-text-primaryLight');
                title.classList.add('text-text-muted');
                
                const icon = i.querySelector('i');
                icon.setAttribute('data-lucide', 'plus');
                
                const p = i.querySelector('p');
                p.classList.remove('h-auto', 'opacity-100');
                p.classList.add('h-0', 'opacity-0');
            });

            // Activate clicked item
            item.classList.add('active');
            item.classList.remove('border-black/10');
            
            const title = item.querySelector('h3');
            title.classList.remove('text-text-muted');
            title.classList.add('text-text-primaryLight');
            
            const icon = item.querySelector('i');
            icon.setAttribute('data-lucide', 'chevron-down');
            
            const p = item.querySelector('p');
            p.classList.remove('h-0', 'opacity-0');
            p.classList.add('h-auto', 'opacity-100');
            
            lucide.createIcons(); // Re-render icons
        });
    });
});
