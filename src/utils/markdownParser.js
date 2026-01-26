/**
 * Parses a standard Markdown resume into structured data.
 * Assumes a format like:
 * # Name
 * **Title** or details
 * 
 * ## Section Title
 * Content...
 */
export const parseResumeMarkdown = (markdown) => {
    if (!markdown) return null;

    const sections = [];
    const lines = markdown.split('\n');

    let currentSection = { title: 'Header', content: [] };

    const knownSections = ['education', 'experience', 'work history', 'employment', 'skills', 'projects', 'summary', 'professional summary', 'profile', 'contact', 'languages', 'certifications'];

    lines.forEach(line => {
        const trimmedLine = line.trim();
        // Match #, ##, or ### headers
        const headerMatch = trimmedLine.match(/^#{1,3}\s+(.*)/);
        // Fallback: Match **SectionName** alone on a line as a header
        const boldHeaderMatch = trimmedLine.match(/^\*\*(.*)\*\*$/);
        // Fallback: Match Plain Uppercase/Titlecase known words (e.g. "EDUCATION", "Work History")
        const isKnownSection = knownSections.includes(trimmedLine.toLowerCase().replace(':', ''));

        if (headerMatch || (boldHeaderMatch && trimmedLine.length < 40) || isKnownSection) {
            let title = '';
            if (headerMatch) title = headerMatch[1].trim();
            else if (boldHeaderMatch) title = boldHeaderMatch[1].trim();
            else title = trimmedLine.replace(':', '');

            // Heuristic to check if this is the Name (H1) or a Section (H2/H3)
            // If it's the very first header found, treat as Name/Header section
            const isName = currentSection.title === 'Header' && sections.length === 0 && !isKnownSection;

            if (currentSection.content.length > 0 || currentSection.title === 'PersonalDetails') {
                sections.push(currentSection);
            }

            if (isName) {
                currentSection = { title: 'PersonalDetails', name: title, content: [] };
            } else {
                currentSection = { title: title, content: [] };
            }
        } else {
            // Content line
            currentSection.content.push(line);
        }
    });

    // Push last section
    if (currentSection && (currentSection.content.length > 0 || currentSection.title)) {
        sections.push(currentSection);
    }

    // Post-process sections to clean up content
    const structuredData = {
        personalDetails: {},
        summary: '',
        experience: [],
        education: [],
        skills: [],
        sections: {} // Catch-all for others
    };

    sections.forEach(section => {
        // Remove empty lines from content start/end
        const cleanContent = section.content.filter(l => l.trim() !== '').join('\n').trim();

        let normalizedTitle = section.title.toLowerCase();

        if (section.title === 'PersonalDetails') {
            structuredData.personalDetails.name = section.name;
            structuredData.personalDetails.raw = cleanContent;
            // Try to extract email/phone/links if standard format
        } else if (normalizedTitle.includes('summary') || normalizedTitle.includes('profile') || normalizedTitle.includes('about')) {
            structuredData.summary = cleanContent;
        } else if (normalizedTitle.includes('experience') || normalizedTitle.includes('employment') || normalizedTitle.includes('work history')) {
            structuredData.experience = parseListItems(cleanContent);
        } else if (normalizedTitle.includes('education') || normalizedTitle.includes('academic')) {
            structuredData.education = parseListItems(cleanContent);
        } else if (normalizedTitle.includes('skills') || normalizedTitle.includes('technologies')) {
            structuredData.skills = parseListItems(cleanContent);
        } else if (normalizedTitle.includes('project')) {
            structuredData.sections['Projects'] = parseListItems(cleanContent);
        } else {
            structuredData.sections[section.title] = cleanContent;
        }
    });

    return structuredData;
};

// Helper: Parse bullet points into array items
const parseListItems = (text) => {
    if (!text) return [];

    // Check if distinct list items exist
    if (text.match(/^[-*]\s/m)) {
        // Split by line start with - or *
        // Regex explanation:
        // Split on newlines that are followed by a bullet and space.
        // We filter out the first empty string if text starts with bullet.
        return text.split(/\n[-*]\s/).map(item => {
            // Clean up the first item if it didn't split well (leading bullet removal)
            return item.replace(/^[-*]\s/, '').trim();
        }).filter(item => item.length > 0);
    }

    // Return raw text if no bullets found, but as single array item or just string?
    // Callers handle string vs array, but better to force array for consistency IF desired,
    // but templates handle string fallback. Let's return the string if no bullets.
    return text;
};
