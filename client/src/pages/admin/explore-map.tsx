import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, ExternalLink, Construction } from "lucide-react";

export default function ExploreMapAdmin() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Map className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" data-testid="text-explore-map-title">Explore Map</h1>
            <Badge variant="secondary" className="text-xs gap-1">
              <Construction className="w-3 h-3" />
              In Development
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Interactive map of North State California institutions</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">About this feature</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Explore Map is an interactive SVG-based map showing all 10 North State California counties
            with educational institution markers. Students can hover over markers to see institution details,
            filter by Healthcare or Education pathways, and access program information.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Current status</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              10 county boundaries from real geographic data
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              10 institution markers with hover tooltips
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Pathway filter (All / Healthcare / Education)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              English / Spanish language support
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
              Mobile responsive layout
            </li>
          </ul>
        </div>

        <a href="/explore" target="_blank" rel="noopener noreferrer">
          <Button className="gap-2" data-testid="button-open-explore-map">
            <ExternalLink className="w-4 h-4" />
            Open Explore Map
          </Button>
        </a>
      </Card>
    </div>
  );
}
