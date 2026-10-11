import { useMutation } from "@tanstack/react-query";
import { Droplets, Loader2, MapPin, Search, Thermometer, Wind } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { ErrorState } from "@/components/query-states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AgentChat } from "@/features/generic/agent-chat";
import { ScheduleDialog } from "@/features/schedules/schedule-dialog";
import {
  executeToolMutation,
  runWorkflowMutation,
  type WorkflowRunResult,
} from "@/lib/mastra-queries";
import type { ViewProps } from "../registry";

// The example custom UIs. Each is registered in features/registry.ts by the
// Mastra id of the agent, workflow or tool it replaces the generic view for.

type CurrentWeather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  conditions: string;
  location: string;
};

type Forecast = {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationChance: number;
  condition: string;
  location: string;
};

/** City input + submit, shared by the tool and workflow views. */
function CityForm({
  pending,
  label,
  onSubmit,
  extra,
}: {
  pending: boolean;
  label: string;
  onSubmit: (city: string) => void;
  extra?: ReactNode;
}) {
  const [city, setCity] = useState("Pune");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (city.trim()) onSubmit(city.trim());
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <div className="relative min-w-48 flex-1">
        <MapPin className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="City"
          className="pl-8"
          aria-label="City"
        />
      </div>
      <Button type="submit" disabled={pending || !city.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Search />}
        {label}
      </Button>
      {extra}
    </form>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
      <div className="text-muted-foreground [&_svg]:size-4">{icon}</div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function WeatherToolInteract({ id }: ViewProps) {
  const lookup = useMutation({ ...executeToolMutation(id), meta: { toast: false } });
  const weather = lookup.data as CurrentWeather | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current weather</CardTitle>
        <CardDescription>Calls the tool directly, without an agent or model.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <CityForm
          pending={lookup.isPending}
          label="Look up"
          onSubmit={(city) => lookup.mutate({ location: city })}
        />
        {lookup.isError && <ErrorState error={lookup.error} title="Lookup failed" />}
        {weather && (
          <div className="grid gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular-nums">
                {Math.round(weather.temperature)}°C
              </span>
              <span className="text-muted-foreground">
                {weather.conditions} in {weather.location}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat icon={<Thermometer />} label="Feels like" value={`${weather.feelsLike}°C`} />
              <Stat icon={<Droplets />} label="Humidity" value={`${weather.humidity}%`} />
              <Stat icon={<Wind />} label="Wind" value={`${weather.windSpeed} km/h`} />
              <Stat icon={<Wind />} label="Gusts" value={`${weather.windGust} km/h`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Picks the forecast step output and the final activities out of a run. */
function toPlan(run: WorkflowRunResult) {
  const fetchStep = run.steps["fetch-weather"];
  return {
    forecast: fetchStep?.status === "success" ? (fetchStep.output as Forecast) : undefined,
    activities: (run.result as { activities: string }).activities,
  };
}

export function WeatherWorkflowInteract({ id }: ViewProps) {
  const [city, setCity] = useState("Pune");
  const plan = useMutation({ ...runWorkflowMutation(id), meta: { toast: false } });
  const result = plan.data && toPlan(plan.data);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Plan activities</CardTitle>
          <CardDescription>
            Fetches the forecast, then asks the weather agent for a plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CityForm
            pending={plan.isPending}
            label="Plan"
            onSubmit={(next) => {
              setCity(next);
              plan.mutate({ city: next });
            }}
            extra={
              <ScheduleDialog
                initial={{
                  name: `Activities in ${city}`,
                  targetType: "workflow",
                  targetId: id,
                  cron: "0 8 * * *",
                  input: { city },
                }}
              />
            }
          />
          {plan.isError && (
            <div className="mt-3">
              <ErrorState error={plan.error} title="Planning failed" />
            </div>
          )}
        </CardContent>
      </Card>

      {result?.forecast && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat icon={<MapPin />} label="Location" value={result.forecast.location} />
          <Stat icon={<Thermometer />} label="Range" value={`${result.forecast.minTemp}° – ${result.forecast.maxTemp}°C`} />
          <Stat icon={<Droplets />} label="Rain chance" value={`${result.forecast.precipitationChance}%`} />
          <Stat icon={<Wind />} label="Conditions" value={result.forecast.condition} />
        </div>
      )}
      {result && (
        <Card>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.activities}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function WeatherAgentInteract({ id }: ViewProps) {
  return (
    <AgentChat
      id={id}
      title="Weather Agent"
      placeholder="What's the weather in Pune?"
      suggestions={[
        "What's the weather in Pune?",
        "Should I carry an umbrella in Mumbai today?",
        "Plan a weekend in Tokyo around the weather",
      ]}
    />
  );
}
