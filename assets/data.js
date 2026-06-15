// Shared data layer — works via localStorage (no server needed for GitHub Pages)
const DB = {
  CAMPS_KEY: 'dg_camps',
  RIDERS_KEY: 'dg_riders',

  getCamps() {
    try {
      return JSON.parse(localStorage.getItem(DB.CAMPS_KEY)) || [];
    } catch { return []; }
  },

  saveCamps(camps) {
    localStorage.setItem(DB.CAMPS_KEY, JSON.stringify(camps));
  },

  getRiders() {
    try {
      return JSON.parse(localStorage.getItem(DB.RIDERS_KEY)) || [];
    } catch { return []; }
  },

  saveRiders(riders) {
    localStorage.setItem(DB.RIDERS_KEY, JSON.stringify(riders));
  },

  addRider(rider) {
    const riders = DB.getRiders();
    rider.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    rider.registeredAt = new Date().toISOString();
    riders.push(rider);
    DB.saveRiders(riders);
    return rider;
  },

  getRidersForCamp(campId) {
    return DB.getRiders().filter(r => r.campId === campId);
  },

  isCampOpen(camp) {
    if (camp.closed) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const campStart = new Date(camp.dateFrom);
    const cutoff = new Date(campStart); cutoff.setDate(cutoff.getDate() - 1);
    if (today >= cutoff) return false;
    if (camp.capacity > 0) {
      const count = DB.getRidersForCamp(camp.id).length;
      if (count >= camp.capacity) return false;
    }
    return true;
  },

  campStatusLabel(camp) {
    if (camp.closed) return { text: 'Uzavřeno', css: 'badge-closed' };
    if (camp.capacity > 0 && DB.getRidersForCamp(camp.id).length >= camp.capacity)
      return { text: 'Obsazeno', css: 'badge-full' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const campStart = new Date(camp.dateFrom);
    const cutoff = new Date(campStart); cutoff.setDate(cutoff.getDate() - 1);
    if (today >= cutoff) return { text: 'Uzavřeno', css: 'badge-closed' };
    return { text: 'Přihlášky otevřeny', css: 'badge-open' };
  },

  seedIfEmpty() {
    if (DB.getCamps().length === 0) {
      const sample = [
        {
          id: 'camp1',
          name: 'Letní BMX Kemp Praha',
          place: 'Praha – Velopark Letňany',
          dateFrom: '2026-08-04',
          dateTo:   '2026-08-08',
          capacity: 20,
          closed: false,
          description: 'Týdenní tréninkový kemp pro závodní jezdce BMX race.'
        },
        {
          id: 'camp2',
          name: 'Podzimní Kemp Brno',
          place: 'Brno – Pump track Líšeň',
          dateFrom: '2026-10-14',
          dateTo:   '2026-10-17',
          capacity: 15,
          closed: false,
          description: 'Technika startu a gate training.'
        }
      ];
      DB.saveCamps(sample);
    }
  }
};
