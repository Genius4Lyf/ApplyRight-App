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
            md += `### ${role.title || 'Role'}\n`;
            md += `${role.company || 'Company'} | ${role.startDate || ''} - ${role.isCurrent ? 'Present' : (role.endDate || '')}\n\n`;

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
    if (skills.length > 0) {
        md += `## Skills\n`;
        const techKeywords = ['javascript', 'js', 'react', 'node', 'python', 'java', 'c++', 'sql', 'aws', 'docker', 'git', 'html', 'css', 'typescript', 'express', 'mongodb', 'redux', 'api', 'scrum', 'agile', 'linux', 'devops', 'cloud', 'security'];
        const softKeywords = ['leadership', 'communication', 'team', 'management', 'planning', 'strategy', 'mentoring', 'negotiation', 'problem', 'critical', 'creativity'];

        const techSkills = [];
        const softSkills = [];
        const otherSkills = [];

        skills.forEach(skillStr => {
            const s = (typeof skillStr === 'object' ? skillStr.type || skillStr.name : skillStr);
            if (!s) return;
            const lower = s.toLowerCase();
            if (techKeywords.some(k => lower.includes(k))) {
                techSkills.push(s);
            } else if (softKeywords.some(k => lower.includes(k))) {
                softSkills.push(s);
            } else {
                otherSkills.push(s);
            }
        });

        if (techSkills.length > 0) md += `- **Technical:** ${techSkills.join(', ')}\n`;
        if (softSkills.length > 0) md += `- **Professional:** ${softSkills.join(', ')}\n`;
        if (otherSkills.length > 0) md += `- **Additional Skills:** ${otherSkills.join(', ')}\n`;
        md += '\n';
    }

    // 5. Education (Moved up prior to Projects)
    if (education.length > 0) {
        md += `## Education\n`;
        education.forEach(edu => {
            md += `### ${edu.degree || 'Degree'}\n`;
            md += `${edu.school || 'School'} | ${edu.graduationDate || ''}\n`;
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
            if (proj.link) {
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
