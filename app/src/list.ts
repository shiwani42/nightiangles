const KEY = "nightiangles.list";

export type StoredList = string[]; // product_code values, in insertion order

function read(): StoredList {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(list: StoredList) {
  sessionStorage.setItem(KEY, JSON.stringify(list));
}

export function getList(): StoredList {
  return read();
}

export function addToList(code: string): StoredList {
  const list = read();
  if (!list.includes(code)) list.push(code);
  write(list);
  return list;
}

export function removeFromList(code: string): StoredList {
  const list = read().filter((c) => c !== code);
  write(list);
  return list;
}

export function clearList(): void {
  sessionStorage.removeItem(KEY);
}
