"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CityInput } from "./city-input";
import { loadSchema, toTons } from "@/lib/validation";
import { GOODS_CATEGORIES } from "@/lib/model";
import type { GoodsCategory } from "@/lib/model";
import * as data from "@/lib/data";
import { defaultDatetimeLocal, fromDatetimeLocal } from "@/lib/format";

export function LoadFormModal({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [pickupCity, setPickupCity] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [goodsType, setGoodsType] = useState("");
  const [goodsCategory, setGoodsCategory] = useState<GoodsCategory>("general");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"tons" | "kg">("tons");
  const [volumeM3, setVolumeM3] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [pickupWindowStart, setPickupWindowStart] = useState(defaultDatetimeLocal(3, 9));
  const [pickupWindowEnd, setPickupWindowEnd] = useState(defaultDatetimeLocal(3, 18));
  const [deliveryDeadline, setDeliveryDeadline] = useState(defaultDatetimeLocal(6, 18));
  const [specialHandling, setSpecialHandling] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loadSchema.safeParse({
      pickupCity,
      deliveryCity,
      goodsType,
      goodsCategory,
      weight,
      weightUnit,
      volumeM3: volumeM3 || "",
      dimensions: dimensions || "",
      pickupWindowStart: fromDatetimeLocal(pickupWindowStart),
      pickupWindowEnd: fromDatetimeLocal(pickupWindowEnd),
      deliveryDeadline: fromDatetimeLocal(deliveryDeadline),
      specialHandling: specialHandling || "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review the highlighted fields.");
      return;
    }
    const weightTons = toTons(parsed.data.weight, parsed.data.weightUnit);
    setBusy(true);
    try {
      await data.createLoad(userId, {
        pickupCity: parsed.data.pickupCity,
        deliveryCity: parsed.data.deliveryCity,
        goodsType: parsed.data.goodsType,
        goodsCategory: parsed.data.goodsCategory,
        weight: weightTons,
        volumeM3: parsed.data.volumeM3 ? Number(parsed.data.volumeM3) : undefined,
        dimensions: parsed.data.dimensions || undefined,
        pickupWindowStart: parsed.data.pickupWindowStart,
        pickupWindowEnd: parsed.data.pickupWindowEnd,
        deliveryDeadline: parsed.data.deliveryDeadline,
        specialHandling: parsed.data.specialHandling || undefined,
      });
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not save the load. Try again.");
      return;
    }
    setBusy(false);
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Post a load" wide>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          We&apos;ll match this against return trips headed your way — cheaper than a dedicated hire.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pickup city" required htmlFor="load-pickup">
            <CityInput id="load-pickup" value={pickupCity} onChange={(e) => setPickupCity(e.target.value)} />
          </Field>
          <Field label="Delivery city" required htmlFor="load-delivery">
            <CityInput id="load-delivery" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Goods description" required htmlFor="load-goods" hint="Short and concrete — e.g. 'Ceramic vitrified tiles'.">
            <Input id="load-goods" value={goodsType} onChange={(e) => setGoodsType(e.target.value)} placeholder="Ceramic tiles (120 boxes)" />
          </Field>
          <Field label="Goods category" required htmlFor="load-category">
            <Select id="load-category" value={goodsCategory} onChange={(e) => setGoodsCategory(e.target.value as GoodsCategory)}>
              {GOODS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Weight" required htmlFor="load-weight">
            <Input id="load-weight" type="number" min={0} step="any" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Unit" required htmlFor="load-wunit">
            <Select id="load-wunit" value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as "tons" | "kg")}>
              <option value="tons">Tonnes</option>
              <option value="kg">Kilograms</option>
            </Select>
          </Field>
          <Field label="Volume (m³)" htmlFor="load-vol" hint="Optional">
            <Input id="load-vol" type="number" min={0} step="any" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} />
          </Field>
        </div>

        <Field label="Dimensions (optional)" htmlFor="load-dims" hint="e.g. 3 × 2 × 2 m">
          <Input id="load-dims" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="3 × 2 × 2 m" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pickup window start" required htmlFor="load-pwin-s">
            <Input id="load-pwin-s" type="datetime-local" value={pickupWindowStart} onChange={(e) => setPickupWindowStart(e.target.value)} />
          </Field>
          <Field label="Pickup window end" required htmlFor="load-pwin-e">
            <Input id="load-pwin-e" type="datetime-local" value={pickupWindowEnd} onChange={(e) => setPickupWindowEnd(e.target.value)} />
          </Field>
        </div>

        <Field label="Delivery deadline" required htmlFor="load-deadline">
          <Input id="load-deadline" type="datetime-local" value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} />
        </Field>

        <Field label="Special handling (optional)" htmlFor="load-handling" hint="Fragile, temperature, stack limits, loading equipment…">
          <Textarea id="load-handling" value={specialHandling} onChange={(e) => setSpecialHandling(e.target.value)} placeholder="Keep dry; forklift needed at pickup." />
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Post load</Button>
        </div>
      </form>
    </Modal>
  );
}