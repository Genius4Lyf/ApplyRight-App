const fs = require('fs');
const path = require('path');

const dirs = [
    path.join(__dirname, 'src/pages/Admin'),
    path.join(__dirname, 'src/components/Admin')
];

const replaceMap = [
    { regex: /'#4F46E5'/g, replacement: "'var(--color-primary)'" },
    { regex: /"#4F46E5"/g, replacement: '"var(--color-primary)"' },

    // Classes
    { regex: /indigo-50/g, replacement: "primary/5" },
    { regex: /indigo-100/g, replacement: "primary/10" },
    { regex: /indigo-200/g, replacement: "primary/20" },
    { regex: /indigo-300/g, replacement: "primary/30" },
    { regex: /indigo-400/g, replacement: "primary/80" },
    { regex: /indigo-500/g, replacement: "primary" },
    { regex: /indigo-600/g, replacement: "primary" },
    { regex: /indigo-700/g, replacement: "primary/90" },
    { regex: /indigo-800/g, replacement: "primary/95" },
    { regex: /indigo-900/g, replacement: "primary" }
];

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const { regex, replacement } of replaceMap) {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

dirs.forEach(processDirectory);
console.log("Done");
