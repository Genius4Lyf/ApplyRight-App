const generateMarkdownFromDraft = (draft) => {
  const {
    personalInfo,
    professionalSummary,
    experience = [],
    education = [],
    certifications = [],
    skills = [],
    projects = [], // Add projects support
    languages = [],
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
    experience.forEach((role) => {
      let displayTitle = role.title || 'Role';
      let displayCompany = role.company || 'Company';
      let displayDate = `${role.startDate || ''} - ${role.isCurrent ? 'Present' : role.endDate || ''}`;

      // Robustness: If company is missing/empty but title contains '|', split it
      if ((!role.company || role.company === 'Company') && displayTitle.includes('|')) {
        const parts = displayTitle.split('|').map((p) => p.trim());
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
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && trimmed !== '-') {
            // Ignore lone dashes
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

    skills.forEach((skill) => {
      // Handle both object (new structure) and string (legacy)
      const name = typeof skill === 'object' ? skill.name : skill;
      const category =
        typeof skill === 'object' && skill.category ? skill.category : 'Additional Skills';

      if (!name) return;

      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(name);
    });

    // Priority order for common categories (Optional: keeps them at the top)
    const priorityOrder = [
      'Technical Skills',
      'Soft Skills',
      'Tools',
      'Languages',
      'Professional Skills',
    ];

    // Output Priority Categories first
    priorityOrder.forEach((cat) => {
      if (categories[cat] && categories[cat].length > 0) {
        md += `- **${cat}:** ${categories[cat].join(', ')}\n`;
        delete categories[cat]; // Remove so we don't duplicate
      }
    });

    // Output remaining categories
    Object.keys(categories).forEach((cat) => {
      if (categories[cat].length > 0) {
        md += `- **${cat}:** ${categories[cat].join(', ')}\n`;
      }
    });

    md += '\n';
  }

  // 5. Education (Moved up prior to Projects)
  if (education.length > 0) {
    md += `## Education\n`;
    education.forEach((edu) => {
      md += `### ${edu.degree || 'Degree'}\n\n`;
      md += `#### ${edu.school || 'School'} | ${edu.graduationDate || ''}\n\n`;
      if (edu.description) {
        md += `- ${edu.description}\n`;
      }
      md += '\n';
    });
  }

  // 5b. Certifications & Training (after Education). Compact bullet list so it
  // renders cleanly across every markdown-based template.
  const certList = (certifications || []).filter((c) => c && (c.name || '').trim());
  if (certList.length > 0) {
    md += `## Certifications\n`;
    certList.forEach((cert) => {
      const meta = [cert.issuer, cert.date].filter((p) => (p || '').trim()).join(', ');
      md += `- **${cert.name.trim()}**${meta ? ` — ${meta}` : ''}\n`;
    });
    md += '\n';
  }

  // 5c. Languages (after Certifications). Deliberately the SAME shape as the
  // certifications list above — "- **Name** — meta" already renders cleanly in every
  // markdown template, and a section is what makes languages visible in all of them
  // rather than only in the three that scrape a line out of Skills.
  //
  // NOT the "- **Label:** value" shape: that is the skills-category pattern cvLabels
  // rewrites when translating a CV, and a language name is not a label to translate.
  const languageList = (languages || []).filter((l) => l && (l.name || '').trim());
  if (languageList.length > 0) {
    md += `## Languages\n`;
    languageList.forEach((language) => {
      const level = (language.level || '').trim();
      md += `- **${language.name.trim()}**${level ? ` — ${level}` : ''}\n`;
    });
    md += '\n';
  }

  // 6. Projects (Moved to Last)
  if (projects.length > 0) {
    md += `## Projects\n`;
    projects.forEach((proj) => {
      md += `### ${proj.title}\n`;
      if (proj.link && (proj.link.startsWith('http') || proj.link.startsWith('www'))) {
        const displayLink = proj.link.replace(/^https?:\/\/(www\.)?/, '');
        md += `Link: [${displayLink}](${proj.link})\n\n`;
      } else {
        md += '\n'; // Ensure space before bullets if no link
      }
      // Bullets
      if (proj.description) {
        const normalizedDesc = proj.description.replace(/•/g, '\n- ');
        const lines = normalizedDesc.split('\n');
        lines.forEach((line) => {
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
