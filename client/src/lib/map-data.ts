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
  { name: "Modoc", x: 82, y: 8 },
  { name: "Siskiyou", x: 38, y: 10 },
  { name: "Lassen", x: 82, y: 30 },
  { name: "Shasta", x: 45, y: 28 },
  { name: "Trinity", x: 18, y: 32 },
  { name: "Plumas", x: 75, y: 52 },
  { name: "Tehama", x: 45, y: 48 },
  { name: "Glenn", x: 32, y: 58 },
  { name: "Butte", x: 55, y: 62 },
  { name: "Sierra", x: 82, y: 68 },
];

export const mapInstitutions: MapInstitution[] = [
  { name: "Shasta College", type: "Community College", county: "Shasta", x: 42, y: 32, marker: "college" },
  { name: "Simpson University", type: "University (Private)", county: "Shasta", x: 48, y: 26, marker: "university" },
  { name: "College of the Siskiyous", type: "Community College", county: "Siskiyou", x: 35, y: 13, marker: "college" },
  { name: "Lassen Community College", type: "Community College", county: "Lassen", x: 80, y: 34, marker: "college" },
  { name: "Butte College", type: "Community College", county: "Butte", x: 52, y: 66, marker: "college" },
  { name: "CSU Chico", type: "University (CSU)", county: "Butte", x: 58, y: 60, marker: "university" },
  { name: "Shasta County Office of Education", type: "County Office of Education", county: "Shasta", x: 50, y: 30, marker: "county-office" },
  { name: "Butte County Office of Education", type: "County Office of Education", county: "Butte", x: 56, y: 68, marker: "county-office" },
  { name: "Siskiyou County Office of Education", type: "County Office of Education", county: "Siskiyou", x: 40, y: 15, marker: "county-office" },
  { name: "Tehama County Office of Education", type: "County Office of Education", county: "Tehama", x: 44, y: 50, marker: "county-office" },
  { name: "UC Davis", type: "University (CSU)", county: null, x: 48, y: 88, marker: "university" },
  { name: "Southern Oregon University", type: "University (Private)", county: null, x: 30, y: 3, marker: "university" },
  { name: "Western Governors University", type: "University (Online)", county: null, x: 12, y: 82, marker: "online" },
  { name: "REACH University", type: "University (Online)", county: null, x: 12, y: 90, marker: "online" },
];
