// @ts-check

import { readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import handlebars from 'handlebars';
import { dirname, join, join as joinPath } from 'path';

/**
 * @param {string} dirPath 
 * @param {(filePath: string) => void} processFile
 */
const traverseDirectory = (dirPath, processFile) => {
    // Read the contents of the directory
    const files = readdirSync(dirPath);
    
    // Loop over each file in that directory
    for (const file of files) {
        // Construct the full path to the file
        const filePath = joinPath(dirPath, file);

        // Check if the current entry is a file
        if (statSync(filePath).isFile()) {
        } else {
            // Recursively traverse directories
            traverseDirectory(filePath, processFile);
        }
    }
};

/**
 * Build a template using envs
 * @param {string} filePath 
 */
const buildTemplate = (filePath) => {
    // Read the template file
    const templateFile = readFileSync(filePath, 'utf-8');

    // Compile the template
    const compiledTemplate = handlebars.compile(templateFile);

    // Render the template with the input object
    const renderedTemplate = compiledTemplate(process.env);

    // Write back over the templated file
    writeFileSync(filePath, renderedTemplate);
};

/**
 * Move files from filePath to ..
 * @param {string} filePath 
 */
const moveFilesUpOneDir = (filePath) => {
    traverseDirectory(filePath, filePath => {
        const parentDir = dirname(filePath);
        const newPath = join(parentDir, '..');
        renameSync(filePath, newPath);
    });
};

// Delete all the base files
rmSync('.github', { recursive: true, force: true });
rmSync('.gitignore');
rmSync('.README.md');
rmSync('.tsconfig.json');

// Replace all the {{ENV}} in the template files
traverseDirectory('template', buildTemplate);

// Move files from /template to .
traverseDirectory('template', moveFilesUpOneDir);

// Delete /template
rmSync('template', { recursive: true, force: true });

// Delete /node_modules
rmSync('node_modules', { recursive: true, force: true });
