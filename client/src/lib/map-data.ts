export interface MapInstitution {
  name: string;
  type: string;
  county: string | null;
  x: number;
  y: number;
  marker: "college" | "university" | "county-office" | "online";
  logo?: string;
}

export interface CountyPath {
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

export const SVG_WIDTH = 600;
export const SVG_HEIGHT = 700;

export const countyPaths: CountyPath[] = [
  {
    name: "Siskiyou",
    path: "M 360.5 27.9 L 360.7 222.8 L 205.3 223 L 201.7 215.6 L 203.1 198.8 L 208.2 190.1 L 194.8 178.7 L 191.7 188.7 L 183.6 189.1 L 182 197 L 173.8 201 L 160.5 218.2 L 146.8 218.2 L 136.7 223.8 L 135.5 245.2 L 142.6 249.6 L 146.3 259.5 L 140.8 268.6 L 134.2 263.4 L 125.8 265.8 L 123.1 255.6 L 115.1 248.7 L 95 248.1 L 87.6 233.1 L 78.9 227.7 L 74.9 230.6 L 64 210.3 L 65.9 204.5 L 58.9 176.3 L 33.5 175.3 L 40.9 156.1 L 34.8 137.6 L 28.7 133.4 L 29.8 124.3 L 25 124.1 L 30.8 114.2 L 29.4 106.5 L 33.7 95.8 L 29.6 79.7 L 31.9 76.2 L 27.3 68.1 L 32.1 66.7 L 37.2 54.2 L 40.6 55.8 L 43.5 50 L 47.7 50.5 L 54.7 27.1 L 223.1 25 L 360.5 27.9 Z",
    labelX: 200, labelY: 130,
  },
  {
    name: "Modoc",
    path: "M 574.4 222.7 L 360.7 222.8 L 360.5 27.9 L 574.5 28.6 L 574.4 222.7 Z",
    labelX: 467, labelY: 125,
  },
  {
    name: "Trinity",
    path: "M 39.1 283.9 L 43.8 284.2 L 48.5 278.7 L 59.6 287.1 L 65.1 280.3 L 71.1 259.5 L 62.6 244.6 L 66.9 242.3 L 67.3 227.9 L 71 223.6 L 74.9 230.6 L 78.9 227.7 L 87.6 233.1 L 95 248.1 L 115.1 248.7 L 123.1 255.6 L 125.8 265.8 L 134.2 263.4 L 140.8 268.6 L 146.3 259.5 L 142.6 249.6 L 135.5 245.2 L 136.7 223.8 L 146.8 218.2 L 160.5 218.2 L 173.8 201 L 182 197 L 183.6 189.1 L 191.7 188.7 L 194.8 178.7 L 208.2 190.1 L 203.1 198.8 L 201.7 215.6 L 206.4 224.7 L 211.9 227 L 212.7 238.5 L 211.4 243.6 L 199.2 249.4 L 201 263.3 L 190.5 272.6 L 190.1 290.4 L 180.6 308.5 L 181.7 317.7 L 173 327.3 L 172.2 339.7 L 167.8 341.1 L 175.7 369.9 L 172.1 368.5 L 165.5 373.8 L 161.8 383.1 L 154 385.3 L 145.6 399.7 L 131.4 406.1 L 131.7 411.5 L 121.1 426.7 L 123.6 442.1 L 134.5 448.5 L 133.1 471.5 L 141 511.5 L 50.8 511.8 L 50.9 329.2 L 48.5 307.6 L 39.1 283.9 Z",
    labelX: 120, labelY: 340,
  },
  {
    name: "Shasta",
    path: "M 278.8 222.9 L 377.6 222.7 L 378.2 399.6 L 343.2 399.5 L 339.7 402.9 L 325.4 397.8 L 318.1 402 L 300.9 400.3 L 293.7 405.4 L 277.5 404.1 L 250.2 412.6 L 249.5 415.8 L 245.5 413.1 L 233.1 417.4 L 213.2 416.9 L 202.1 412 L 182.7 427.7 L 168.3 418.7 L 150.2 422.8 L 143 432.9 L 134.6 430.8 L 121.6 437.6 L 121.1 426.7 L 131.7 411.5 L 131.4 406.1 L 145.6 399.7 L 154 385.3 L 161.8 383.1 L 165.5 373.8 L 172.1 368.5 L 175.7 369.9 L 167.8 341.1 L 172.2 339.7 L 173 327.3 L 181.7 317.7 L 180.6 308.5 L 190.1 290.4 L 190.5 272.6 L 201 263.3 L 199.2 249.4 L 211.4 243.6 L 213 229.4 L 205.3 223 L 278.8 222.9 Z",
    labelX: 260, labelY: 340,
  },
  {
    name: "Lassen",
    path: "M 463.5 222.7 L 574.4 222.7 L 572 576.1 L 552.6 576.3 L 558 562.4 L 559.7 527.8 L 544.6 503.1 L 543.4 485.7 L 537.9 485.7 L 537.9 480.5 L 518.3 475.3 L 498.9 446.7 L 478 432.6 L 461.5 430.6 L 456.7 434.2 L 456.8 439.8 L 445.6 448.4 L 445.6 458.5 L 437.2 460.3 L 434.6 453.4 L 426.1 453.4 L 417.6 444.9 L 417.6 399.3 L 378.2 399.6 L 377.6 222.7 L 463.5 222.7 Z",
    labelX: 490, labelY: 380,
  },
  {
    name: "Tehama",
    path: "M 249.5 415.8 L 250.2 412.6 L 271.2 405.6 L 287.7 406.8 L 300.9 400.3 L 318.1 402 L 325.4 397.8 L 339.7 402.9 L 353.1 399.6 L 356.6 404.8 L 357.2 422.4 L 370.5 424.8 L 376.1 432.1 L 371 434.9 L 375.1 443 L 372.2 455.5 L 361.1 460.6 L 359.8 477 L 351.2 482.2 L 340 482.2 L 331.2 510.5 L 323 510 L 311.9 533 L 272.3 534.1 L 268.7 544.5 L 272.1 554.8 L 140.4 554.6 L 137.1 543.4 L 138.6 528.4 L 144.1 521.7 L 135.2 487.8 L 134.9 450.6 L 121.6 437.6 L 134.6 430.8 L 143 432.9 L 150.2 422.8 L 168.3 418.7 L 182.7 427.7 L 202.1 412 L 213.2 416.9 L 233.1 417.4 L 245.5 413.1 L 249.5 415.8 Z",
    labelX: 264, labelY: 470,
  },
  {
    name: "Plumas",
    path: "M 374.8 548 L 373.3 540.9 L 365.8 537.1 L 365.9 530.1 L 363.1 530.2 L 365.9 526.6 L 364.7 502.5 L 372.5 485.7 L 360.9 463.7 L 361.8 459.6 L 366.5 460.5 L 372.2 455.5 L 375.1 443 L 371 434.9 L 376.1 432.1 L 370.5 424.8 L 357.2 422.4 L 356.6 404.8 L 353.1 399.6 L 417.6 399.3 L 417.6 444.9 L 426.1 453.4 L 434.6 453.4 L 437.2 460.3 L 445.6 458.5 L 445.6 448.4 L 456.8 439.8 L 456.7 434.2 L 461.5 430.6 L 489.2 437.9 L 489.2 443.1 L 498.9 446.7 L 518.3 475.3 L 537.9 480.5 L 537.9 485.7 L 543.4 485.7 L 544.6 503.1 L 559.7 527.8 L 558 562.4 L 552.6 576.3 L 477.7 576.6 L 473.8 583.7 L 463.7 573.5 L 457.3 575.8 L 445.3 559.9 L 436.3 568.9 L 434.1 584.7 L 415.3 602.8 L 406.5 595.4 L 406.5 588.5 L 395.8 578.1 L 395.5 572 L 374.8 548 Z",
    labelX: 450, labelY: 500,
  },
  {
    name: "Glenn",
    path: "M 147.1 576 L 144.1 576.1 L 144.2 566.6 L 140.3 566.6 L 140.4 554.6 L 275.4 554.8 L 275.3 561.9 L 283.7 572.9 L 286.6 570.4 L 287.6 578.6 L 279.8 585 L 283.9 589.5 L 280.1 595 L 279.8 617.9 L 300.1 617.2 L 295.2 653.9 L 277.5 653.9 L 277.6 646.8 L 258.8 646.5 L 258.9 653.5 L 169.8 654 L 170.3 606.7 L 148.2 606.9 L 147.1 576 Z",
    labelX: 220, labelY: 610,
  },
  {
    name: "Butte",
    path: "M 296.8 673.1 L 292.5 673 L 300.1 617.2 L 279.8 617.9 L 280.1 595 L 283.9 589.5 L 279.5 586.8 L 286.9 580.5 L 286.6 570.4 L 283.7 572.9 L 275.3 561.9 L 275.4 554.8 L 270.2 552.5 L 268.7 544.5 L 272.3 534.1 L 311.9 533 L 323 510 L 331.2 510.5 L 340 482.2 L 351.2 482.2 L 359.8 477 L 362.1 469.9 L 366.9 470 L 372.4 489.1 L 364.7 502.5 L 365.9 526.6 L 363.1 530.2 L 365.9 530.1 L 365.8 537.1 L 373.3 540.9 L 384.4 562 L 395.5 572 L 395.8 578.1 L 406.5 588.5 L 406.5 595.4 L 412.2 597.1 L 414.9 605.6 L 404.5 612.8 L 403.1 621.4 L 381.6 621.4 L 371.6 658.5 L 366.5 664.4 L 343.5 672.8 L 336.3 669.9 L 334.5 675 L 296.8 673.1 Z",
    labelX: 335, labelY: 585,
  },
  {
    name: "Sierra",
    path: "M 477.6 579.6 L 477.7 576.6 L 572 576.1 L 574.2 572.8 L 573.8 639.2 L 499.7 639 L 492.2 622.8 L 477.5 619.8 L 462.5 637.5 L 429.8 645.7 L 423.4 652 L 421.6 622.6 L 418.1 616.6 L 423.1 611.9 L 425.3 592.6 L 434.1 584.7 L 439.5 564.4 L 445.3 559.9 L 457.3 575.8 L 463.7 573.5 L 473.8 583.7 L 477.6 579.6 Z",
    labelX: 490, labelY: 608,
  },
];

export const mapInstitutions: MapInstitution[] = [
  { name: "Shasta College", type: "Community College", county: "Shasta", x: 228, y: 369, marker: "college", logo: "https://www.shastacollege.edu/wp-content/uploads/2020/01/SC_Seal_color-300x300.png" },
  { name: "Simpson University", type: "University (Private)", county: "Shasta", x: 221, y: 363, marker: "university", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/Simpson_University_seal.svg/200px-Simpson_University_seal.svg.png" },
  { name: "College of the Siskiyous", type: "Community College", county: "Siskiyou", x: 232, y: 92, marker: "college", logo: "https://www.siskiyous.edu/marketing/images/logos/cos-seal-color.png" },
  { name: "Lassen Community College", type: "Community College", county: "Lassen", x: 405, y: 388, marker: "college", logo: "https://www.lassencollege.edu/about/PublishingImages/Pages/default/Lassen%20College%20Seal.png" },
  { name: "Butte College", type: "Community College", county: "Butte", x: 331, y: 589, marker: "college", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/da/Butte_College_seal.svg/200px-Butte_College_seal.svg.png" },
  { name: "CSU Chico", type: "University (CSU)", county: "Butte", x: 301, y: 571, marker: "university", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/6/6b/Chico_State_Seal.svg/200px-Chico_State_Seal.svg.png" },
  { name: "Shasta County Office of Education", type: "County Office of Education", county: "Shasta", x: 240, y: 366, marker: "county-office", logo: "https://www.shastacoe.org/uploaded/themes/shastacoe/img/shasta-coe-logo.png" },
  { name: "Butte County Office of Education", type: "County Office of Education", county: "Butte", x: 310, y: 577, marker: "county-office", logo: "https://www.bcoe.org/cms/lib/CA02218prior/Centricity/Domain/1/BCOE-Logo-Color.png" },
  { name: "Siskiyou County Office of Education", type: "County Office of Education", county: "Siskiyou", x: 245, y: 92, marker: "county-office", logo: "https://www.siskiyoucoe.net/cms/lib/CA02000300/Centricity/Domain/1/SCOE-Logo.png" },
  { name: "Tehama County Office of Education", type: "County Office of Education", county: "Tehama", x: 244, y: 464, marker: "county-office", logo: "https://www.tehamacoe.org/cms/lib/CA02218566/Centricity/Domain/1/TCDE-Logo.png" },
];

export const offMapInstitutions: MapInstitution[] = [
  { name: "UC Davis", type: "University (UC)", county: null, x: 0, y: 0, marker: "university", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d1/University_of_California%2C_Davis_seal.svg/200px-University_of_California%2C_Davis_seal.svg.png" },
  { name: "Southern Oregon University", type: "University (Out-of-State)", county: null, x: 0, y: 0, marker: "university", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Southern_Oregon_University_seal.svg/200px-Southern_Oregon_University_seal.svg.png" },
  { name: "Western Governors University", type: "University (Online)", county: null, x: 0, y: 0, marker: "online", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/WGU_Seal.svg/200px-WGU_Seal.svg.png" },
  { name: "REACH University", type: "University (Online)", county: null, x: 0, y: 0, marker: "online", logo: "https://www.reach.edu/wp-content/uploads/2021/08/REACH-Logo-Horizontal-Full-Color.png" },
];
