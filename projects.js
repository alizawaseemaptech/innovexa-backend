// projects.js — JSON-file based storage for portfolio projects.
// Admin adds/edits/deletes projects from the admin dashboard; the public
// website fetches them via GET /api/projects to display in the "Our Work"
// section automatically — no need to touch the website's HTML each time.

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'projects.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ nextId: 1, projects: [] }, null, 2));
}

function readData() {
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function createProject(fields) {
  const data = readData();
  const project = {
    id: data.nextId,
    title: fields.title,
    category: fields.category || '',
    description: fields.description || '',
    image_url: fields.image_url || '',
    link: fields.link || '',
    published: fields.published !== false, // published by default
    created_at: new Date().toISOString(),
  };
  data.projects.push(project);
  data.nextId += 1;
  writeData(data);
  return project;
}

function getAllProjects({ publishedOnly = false } = {}) {
  const data = readData();
  let list = [...data.projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (publishedOnly) list = list.filter((p) => p.published);
  return list;
}

function updateProject(id, fields) {
  const data = readData();
  const project = data.projects.find((p) => p.id === Number(id));
  if (!project) return null;
  Object.assign(project, fields);
  writeData(data);
  return project;
}

function deleteProject(id) {
  const data = readData();
  data.projects = data.projects.filter((p) => p.id !== Number(id));
  writeData(data);
  return true;
}

module.exports = {
  createProject,
  getAllProjects,
  updateProject,
  deleteProject,
};
