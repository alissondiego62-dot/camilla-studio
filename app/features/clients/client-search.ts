export function normalizeClientSearch(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim()}
export function onlyDigits(value:string){return value.replace(/\D+/g,"")}
