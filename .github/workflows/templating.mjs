// @ts-check

import { statSync } from 'fs';
import { mkdir, readdir, readFile } from 'fs/promises';
import { rename as moveFile, rm, writeFile } from 'fs/promises';
import handlebars from 'handlebars';
import { dirname, join as joinPath } from 'path';

/**
 * @param {string} dirPath 
 * @param {(filePath: string) => Promise<void>} processFile
 */
const traverseDirectory = async (dirPath, processFile) => {
    console.log('Traversing %s', dirPath);

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
    console.log('Building %s', filePath);

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
    console.log('Moving files from %s to %s', filePath, filePath.replace('template/', ''));
    const newPath = filePath.replace('template/', '');
    try {
        // Try to move the file
        await moveFile(filePath, newPath);
    } catch {
        // If this fails try and make the directory first
        await mkdir(dirname(newPath), { recursive: true });
        await moveFile(filePath, newPath);
    }
};

// Delete all the base files
await rm('.gitignore');
await rm('README.md');
await rm('tsconfig.json');

// Replace all the {{ENV}} in the template files
await traverseDirectory('./template', buildTemplate);

// Move files from /template to .
await traverseDirectory('./template', moveFilesUpOneDir);

// Delete /template
await rm('template', { recursive: true, force: true });

// Delete /node_modules
await rm('node_modules', { recursive: true, force: true });
