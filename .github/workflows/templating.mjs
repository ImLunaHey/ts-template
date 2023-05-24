// @ts-check

import { readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import { readFile, readdir, rename, rm, writeFile } from 'fs/promises';
import handlebars from 'handlebars';
import { dirname, join, join as joinPath } from 'path';

/**
 * @param {string} dirPath 
 * @param {(filePath: string) => Promise<void>} processFile
 */
const traverseDirectory = async (dirPath, processFile) => {
    // Read the contents of the directory
    const files = await readdir(dirPath);
    
    // Loop over each file in that directory
    for (const file of files) {
        // Construct the full path to the file
        const filePath = joinPath(dirPath, file);

        // Check if the current entry is a file
        if (statSync(filePath).isFile()) {
            await processFile(filePath);
        } else {
            // Recursively traverse directories
            await traverseDirectory(filePath, processFile);
        }
    }
};

/**
 * Build a template using envs
 * @param {string} filePath 
 */
const buildTemplate = async (filePath) => {
    // Read the template file
    const templateFile = await readFile(filePath, 'utf-8');

    // Compile the template
    const compiledTemplate = handlebars.compile(templateFile);

    // Render the template with the input object
    const renderedTemplate = compiledTemplate(process.env);

    // Write back over the templated file
    await writeFile(filePath, renderedTemplate);
};

/**
 * Move files from filePath to ..
 * @param {string} filePath 
 */
const moveFilesUpOneDir = async (filePath) => {
    await traverseDirectory(filePath, async filePath => {
        const parentDir = dirname(filePath);
        const newPath = join(parentDir, '..');
        await rename(filePath, newPath);
    });
};

// Delete all the base files
await rm('.github', { recursive: true, force: true });
await rm('.gitignore');
await rm('README.md');
await rm('.tsconfig.json');

// Replace all the {{ENV}} in the template files
await traverseDirectory('template', buildTemplate);

// Move files from /template to .
await traverseDirectory('template', moveFilesUpOneDir);

// Delete /template
await rm('template', { recursive: true, force: true });

// Delete /node_modules
await rm('node_modules', { recursive: true, force: true });
