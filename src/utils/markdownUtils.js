/**
 * Converts a structured DraftCV object into the Markdown format
 * expected by the ResumeReview and Template components.
 * 
 * @param {Object} draft - The DraftCV object from backend
 * @returns {Object} - { optimizedCV: "markdown string" }
 */
export const generateMarkdownFromDraft = (draft) => {
    if (!draft) return { optimizedCV: '' };

    const {
        personalInfo = {},
        professionalSummary = '',
        experience = [],
        projects = [],
        education = [],
        skills = []
    } = draft;

    let md = '';

    // 1. Header (Name)
    if (personalInfo.fullName) {
        md += `# ${personalInfo.fullName.toUpperCase()}\n\n`;
    }

    // 1b. Contact Info (This is usually parsed from text in the original flow, but for templates
    // we might need to rely on the template extracting it, or we format it as a sub-header line.
    // Most templates in this app expect the markdown to just have sections, and they use the 'userProfile' prop
    // for contact info. However, 'ATSCleanTemplate' and others might parse the header.
    // Let's check how templates work. They often take 'markdown' AND 'userProfile'.
    // We should ensure the 'userProfile' passed to templates also contains this draft info if possible,
    // OR we put it in the markdown.
    // Standard "AI Optimized" markdown usually looks like:
    // # NAME
    // (Contact info might be here or handled separately)
    // ## Professional Summary
    // ...
    //
    // Let's stick to the standard sections.

    // 2. Professional Summary
    if (professionalSummary) {
        md += `## Professional Summary\n${professionalSummary}\n\n`;
    }

    // 3. Work History
    if (experience.length > 0) {
        md += `## Work History\n`;
        experience.forEach(role => {
            md += `### ${role.title || 'Role'}\n`;
            md += `${role.company || 'Company'} | ${role.startDate || ''} - ${role.isCurrent ? 'Present' : (role.endDate || '')}\n`;

            // Handle bullet points
            if (role.description) {
                // Determine if description is already bulleted
                const lines = role.description.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed) {
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

    // 4. Projects (New Section)
    if (projects.length > 0) {
        md += `## Projects\n`;
        projects.forEach(proj => {
            md += `### ${proj.title}\n`;
            if (proj.link) {
                md += `Link: [${proj.link}](${proj.link})\n`;
            }
            // Bullets
            if (proj.description) {
                const lines = proj.description.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed) {
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

    // 5. Education
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

    // 6. Skills
    if (skills.length > 0) {
        md += `## Skills\n`;
        // Check if skills is array of strings or objects. Our Schema says [{type: String}].
        // Wait, schema was: skills: [{type: String}] which means array of objects with 'type' prop?
        // Or did I define it as type: [String]?
        // Let's check schema. Schema: skills: [{type: String}] -> this means it's an array of objects like { _id: ..., type: "Skill Name" }? 
        // No, `type: String` inside an object in array definition usually means the array items are Strings? 
        // Mongoose syntax: `skills: [String]` or `skills: [{ name: String }]`.
        // If I wrote `skills: [{ type: String }]`, Mongoose interprets it as an array of objects where each object has a property `type` which is a string.
        // I should probably have written `skills: [String]`.
        // I will need to check how I implemented the Schema. 
        // Schema: `skills: [{ type: String }]` -> This is ambiguous. It usually means an array of objects `{type: "JS"}`.
        // Use `skills.map(s => s.type || s)` to be safe.

        md += `- ${skills.map(s => (typeof s === 'object' ? s.type : s)).join(', ')}\n`;
    }

    return { optimizedCV: md };
};
