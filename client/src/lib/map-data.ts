export interface MapInstitution {
  name: string;
  type: "Community College" | "University (CSU)" | "University (Private)" | "University (Online)" | "County Office of Education";
  county: string | null;
  x: number;
  y: number;
  marker: "college" | "university" | "county-office" | "online";
}

export interface MapCounty {
  name: string;
  x: number;
  y: number;
}

export const mapCounties: MapCounty[] = [
  { name: "Siskiyou", x: 40, y: 18 },
  { name: "Modoc", x: 72, y: 12 },
  { name: "Trinity", x: 22, y: 35 },
  { name: "Shasta", x: 38, y: 30 },
  { name: "Lassen", x: 72, y: 32 },
  { name: "Tehama", x: 38, y: 55 },
  { name: "Plumas", x: 62, y: 60 },
  { name: "Glenn", x: 28, y: 68 },
  { name: "Butte", x: 48, y: 75 },
  { name: "Sierra", x: 72, y: 72 },
];

export const mapInstitutions: MapInstitution[] = [
  { name: "Shasta College", type: "Community College", county: "Shasta", x: 30, y: 28, marker: "college" },
  { name: "Simpson University", type: "University (Private)", county: "Shasta", x: 33, y: 33, marker: "university" },
  { name: "College of the Siskiyous", type: "Community College", county: "Siskiyou", x: 36, y: 12, marker: "college" },
  { name: "Lassen Community College", type: "Community College", county: "Lassen", x: 70, y: 36, marker: "college" },
  { name: "Butte College", type: "Community College", county: "Butte", x: 44, y: 78, marker: "college" },
  { name: "CSU Chico", type: "University (CSU)", county: "Butte", x: 50, y: 72, marker: "university" },
  { name: "Shasta County Office of Education", type: "County Office of Education", county: "Shasta", x: 36, y: 26, marker: "county-office" },
  { name: "Butte County Office of Education", type: "County Office of Education", county: "Butte", x: 52, y: 80, marker: "county-office" },
  { name: "Siskiyou County Office of Education", type: "County Office of Education", county: "Siskiyou", x: 44, y: 14, marker: "county-office" },
  { name: "Tehama County Office of Education", type: "County Office of Education", county: "Tehama", x: 34, y: 58, marker: "county-office" },
  { name: "UC Davis", type: "University (CSU)", county: null, x: 40, y: 95, marker: "university" },
  { name: "Southern Oregon University", type: "University (Private)", county: null, x: 38, y: 3, marker: "university" },
  { name: "Western Governors University", type: "University (Online)", county: null, x: 88, y: 82, marker: "online" },
  { name: "REACH University", type: "University (Online)", county: null, x: 88, y: 90, marker: "online" },
];
