const generateMarkdownFromDraft = (draft) => {
    const {
        personalInfo,
        professionalSummary,
        experience = [],
        education = [],
        skills = [],
        projects = [] // Add projects support
    } = draft;

    let md = '';

    // 1. Header (Name & Contact) - Removed to avoid duplication in templates
    // specific templates render their own header from userProfile data.

    // 2. Professional Summary
    if (professionalSummary) {
        md += `## Professional Summary\n${professionalSummary}\n\n`;
    }

    // 3. Work History
    if (experience.length > 0) {
        md += `## Work History\n`;
        experience.forEach(role => {
            let displayTitle = role.title || 'Role';
            let displayCompany = role.company || 'Company';
            let displayDate = `${role.startDate || ''} - ${role.isCurrent ? 'Present' : (role.endDate || '')}`;

            // Robustness: If company is missing/empty but title contains '|', split it
            if ((!role.company || role.company === 'Company') && displayTitle.includes('|')) {
                const parts = displayTitle.split('|').map(p => p.trim());
                if (parts.length >= 2) {
                    displayTitle = parts[0];
                    displayCompany = parts[1];
                    // Attempt to extract date from 3rd part or 2nd part if it looks like a date
                    if (parts.length > 2) {
                        displayDate = parts[2];
                    }
                }
            }

            md += `### ${displayTitle}\n\n`;
            md += `#### ${displayCompany} | ${displayDate}\n\n`;

            // Handle bullet points
            if (role.description) {
                // Determine if description is already bulleted or has inline bullets
                // Replace '•' with newline to ensure splitting
                const normalizedDesc = role.description.replace(/•/g, '\n- ');
                const lines = normalizedDesc.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed && trimmed !== '-') { // Ignore lone dashes
                        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                            md += `${trimmed}\n`;
                        } else {
                            md += `- ${trimmed}\n`;
                        }
                    }
                });
            }
            md += '\n'; // spacing
        });
    }

    // 4. Skills (Categorized)
    // 4. Skills (Categorized)
    if (skills.length > 0) {
        md += `## Skills\n`;

        // Group by category
        const categories = {};

        skills.forEach(skill => {
            // Handle both object (new structure) and string (legacy)
            const name = typeof skill === 'object' ? skill.name : skill;
            const category = (typeof skill === 'object' && skill.category) ? skill.category : 'Additional Skills';

            if (!name) return;

            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(name);
        });

        // Priority order for common categories (Optional: keeps them at the top)
        const priorityOrder = ['Technical Skills', 'Soft Skills', 'Tools', 'Languages', 'Professional Skills'];

        // Output Priority Categories first
        priorityOrder.forEach(cat => {
            if (categories[cat] && categories[cat].length > 0) {
                md += `- **${cat}:** ${categories[cat].join(', ')}\n`;
                delete categories[cat]; // Remove so we don't duplicate
            }
        });

        // Output remaining categories
        Object.keys(categories).forEach(cat => {
            if (categories[cat].length > 0) {
                md += `- **${cat}:** ${categories[cat].join(', ')}\n`;
            }
        });

        md += '\n';
    }

    // 5. Education (Moved up prior to Projects)
    if (education.length > 0) {
        md += `## Education\n`;
        education.forEach(edu => {
            md += `### ${edu.degree || 'Degree'}\n\n`;
            md += `#### ${edu.school || 'School'} | ${edu.graduationDate || ''}\n\n`;
            if (edu.description) {
                md += `- ${edu.description}\n`;
            }
            md += '\n';
        });
    }

    // 6. Projects (Moved to Last)
    if (projects.length > 0) {
        md += `## Projects\n`;
        projects.forEach(proj => {
            md += `### ${proj.title}\n`;
            if (proj.link && (proj.link.startsWith('http') || proj.link.startsWith('www'))) {
                md += `Link: [${proj.link}](${proj.link})\n\n`;
            } else {
                md += '\n'; // Ensure space before bullets if no link
            }
            // Bullets
            if (proj.description) {
                const normalizedDesc = proj.description.replace(/•/g, '\n- ');
                const lines = normalizedDesc.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed && trimmed !== '-') {
                        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                            md += `${trimmed}\n`;
                        } else {
                            md += `- ${trimmed}\n`;
                        }
                    }
                });
            }
            md += '\n';
        });
    }

    return { optimizedCV: md };
};

// Export properly to be used in ES6 imports
export { generateMarkdownFromDraft };
export default { generateMarkdownFromDraft };
