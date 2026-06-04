import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR     = path.join(process.cwd(), 'data');
const TASKS_FILE   = path.join(DATA_DIR, 'tasks.json');
const REMIND_FILE  = path.join(DATA_DIR, 'reminders.json');

function readJSON(filePath: string): unknown[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function GET() {
  const tasks     = readJSON(TASKS_FILE);
  const reminders = readJSON(REMIND_FILE);
  return NextResponse.json({ tasks, reminders });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  ensureDataDir();

  if ('tasks' in body) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(body.tasks, null, 2));
  }
  if ('reminders' in body) {
    fs.writeFileSync(REMIND_FILE, JSON.stringify(body.reminders, null, 2));
  }

  return NextResponse.json({ ok: true });
}
