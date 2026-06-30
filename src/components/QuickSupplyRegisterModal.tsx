import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CollectionCenter,
  listCollectionCenters,
} from '../lib/collectionCentersApi';
import {
  MANUAL_SUPPLY_NEED_KEY,
  SupplyCategory,
  SupplyEntryType,
  SupplyItemBalance,
  createCenterSupplyEntry,
  formatQty,
  listOpenSupplyNeedsForCenter,
  listSupplyCategories,
  projectReception,
  supplyItemKey,
  todayIsoDate,
} from '../lib/centerSupplyApi';
import CenterPicker from './CenterPicker';
import SelectField from './SelectField';
import SupplyCategoryField from './SupplyCategoryField';

export type QuickSupplyRegisterModalProps = {
  open: boolean;
  entryType: SupplyEntryType;
  onClose: () => void;
  onSaved?: () => void;
  /** Si se indica, el centro queda fijo y no se muestra el selector. */
  presetCenter?: Pick<CollectionCenter, 'id' | 'name'>;
  /** Necesidad abierta a preseleccionar al registrar recepción. */
  presetNeedKey?: string;
};

export default function QuickSupplyRegisterModal({
  open,
  entryType: initialEntryType,
  onClose,
  onSaved,
  presetCenter,
  presetNeedKey,
}: QuickSupplyRegisterModalProps) {
  const [entryType, setEntryType] = useState<SupplyEntryType>(initialEntryType);
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [openNeeds, setOpenNeeds] = useState<SupplyItemBalance[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  const [selectedNeedKey, setSelectedNeedKey] = useState('');
  const [saveResult, setSaveResult] = useState<{
    itemLabel: string;
    surplus: number;
    pendingAfter: number;
  } | null>(null);

  const activeCenterId = presetCenter?.id || selectedCenterId;

  const selectedCenterName = useMemo(
    () =>
      presetCenter?.name ||
      centers.find((c) => c.id === selectedCenterId)?.name ||
      '',
    [presetCenter, centers, selectedCenterId]
  );

  const resetFields = (type: SupplyEntryType = initialEntryType) => {
    setEntryType(type);
    setSelectedCenterId(presetCenter?.id || '');
    setCenterFilter('');
    setCategoryName('');
    setItemName('');
    setQuantity('1');
    setEntryDate(todayIsoDate());
    setOpenNeeds([]);
    setSelectedNeedKey(presetNeedKey || '');
    setSaveResult(null);
    setError('');
  };

  useEffect(() => {
    if (!open) return;
    resetFields(initialEntryType);
    setLoading(true);
    Promise.all([listCollectionCenters(true), listSupplyCategories()])
      .then(([ctrs, cats]) => {
        setCenters(ctrs);
        setCategories(cats);
        const defaultName =
          cats.find((c) => c.name.toLowerCase() === 'insumos')?.name || cats[0]?.name || '';
        setCategoryName(defaultName);
      })
      .catch((err: any) => {
        setError(err?.message || 'No se pudo cargar el formulario.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEntryType, presetCenter?.id, presetNeedKey]);

  useEffect(() => {
    if (!open || entryType !== 'recepcion' || !activeCenterId) {
      setOpenNeeds([]);
      if (!presetNeedKey) setSelectedNeedKey('');
      return;
    }

    setLoadingNeeds(true);
    listOpenSupplyNeedsForCenter(activeCenterId)
      .then((needs) => {
        setOpenNeeds(needs);
        setSelectedNeedKey((prev) => {
          if (presetNeedKey && needs.some((n) => supplyItemKey(n.categoryId, n.itemName) === presetNeedKey)) {
            return presetNeedKey;
          }
          if (prev === MANUAL_SUPPLY_NEED_KEY) return prev;
          if (prev && needs.some((n) => supplyItemKey(n.categoryId, n.itemName) === prev)) {
            return prev;
          }
          return needs.length === 1 ? supplyItemKey(needs[0].categoryId, needs[0].itemName) : '';
        });
        if (presetNeedKey) {
          const match = needs.find((n) => supplyItemKey(n.categoryId, n.itemName) === presetNeedKey);
          if (match) setQuantity(String(match.balance));
        }
      })
      .catch(() => setOpenNeeds([]))
      .finally(() => setLoadingNeeds(false));
  }, [open, entryType, activeCenterId, presetNeedKey]);

  const selectedNeed = useMemo(() => {
    if (!selectedNeedKey || selectedNeedKey === MANUAL_SUPPLY_NEED_KEY) return null;
    return openNeeds.find((n) => supplyItemKey(n.categoryId, n.itemName) === selectedNeedKey) || null;
  }, [openNeeds, selectedNeedKey]);

  const linkedToNeed = entryType === 'recepcion' && selectedNeed !== null;

  useEffect(() => {
    if (!selectedNeed) return;
    setCategoryName(selectedNeed.categoryName);
    setItemName(selectedNeed.itemName);
  }, [selectedNeed]);

  const receptionQty = Number(quantity);
  const receptionProjection = useMemo(() => {
    if (entryType !== 'recepcion' || !Number.isFinite(receptionQty) || receptionQty <= 0) {
      return null;
    }
    return projectReception(selectedNeed, receptionQty);
  }, [entryType, selectedNeed, receptionQty]);

  const needOptions = useMemo(
    () => [
      { value: '', label: 'Seleccione la necesidad a suplir…' },
      ...openNeeds.map((need) => ({
        value: supplyItemKey(need.categoryId, need.itemName),
        label: `${need.categoryName} · ${need.itemName} (faltan ${formatQty(need.balance)})`,
      })),
      { value: MANUAL_SUPPLY_NEED_KEY, label: 'Otro ítem (sin necesidad registrada)' },
    ],
    [openNeeds]
  );

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const centerId = activeCenterId;
    if (!centerId) {
      setError('Seleccione un centro de acopio.');
      return;
    }
    if (entryType === 'recepcion' && !selectedNeedKey) {
      setError('Indique qué necesidad va a suplir o elija otro ítem.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createCenterSupplyEntry({
        collectionCenterId: centerId,
        categoryName: categoryName.trim(),
        itemName,
        quantity: Number(quantity),
        entryType,
        entryDate,
      });

      if (entryType === 'recepcion' && receptionProjection) {
        const itemLabel = `${categoryName.trim()} · ${itemName.trim()}`;
        setSaveResult({
          itemLabel,
          surplus: receptionProjection.surplus,
          pendingAfter: receptionProjection.pendingAfter,
        });
        onSaved?.();
        return;
      }

      onSaved?.();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDismissResult = () => {
    setSaveResult(null);
    resetFields(entryType);
    onSaved?.();
    onClose();
  };

  if (!open) return null;

  const isNeed = entryType === 'necesidad';

  if (saveResult) {
    const { itemLabel, surplus, pendingAfter } = saveResult;
    return (
      <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-xs sm:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Recepción registrada</h3>
            <p className="mt-1 text-xs text-slate-500">{itemLabel}</p>
          </div>
          <div className="space-y-3 p-5">
            {surplus > 0 ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Superávit</p>
                <p className="mt-1 text-sm font-semibold text-sky-900">
                  Exceso de {formatQty(surplus)} unidades respecto a la necesidad.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pendiente</p>
                <p className="mt-1 text-sm font-semibold text-amber-900">
                  Aún faltan {formatQty(pendingAfter)} unidades para cubrir la necesidad.
                </p>
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 bg-slate-50 p-4">
            <button
              type="button"
              onClick={handleDismissResult}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Listo
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-xs sm:items-center">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Registro rápido de insumos</h3>
            <p className="text-[11px] text-slate-500">Necesidad o recepción · elija el centro en el formulario</p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setEntryType('necesidad');
                setSelectedNeedKey('');
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                isNeed ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Necesidad
            </button>
            <button
              type="button"
              onClick={() => setEntryType('recepcion')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                !isNeed ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Recepción
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              Cargando…
            </div>
          ) : (
            <>
              {!presetCenter && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Centro de acopio
                  </label>
                  <CenterPicker
                    collectionCenters={centers}
                    recentCenterIds={[]}
                    selectedCenterId={selectedCenterId}
                    selectedCenterName={selectedCenterName}
                    centerFilter={centerFilter}
                    onCenterFilterChange={setCenterFilter}
                    onSelectCenter={(c) => setSelectedCenterId(c.id)}
                    onClearSelection={() => setSelectedCenterId('')}
                  />
                </div>
              )}

              {presetCenter && (
                <div className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">
                  Centro: {presetCenter.name}
                </div>
              )}

              {!isNeed && activeCenterId && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Necesidad a suplir
                  </label>
                  {loadingNeeds ? (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                      Cargando necesidades abiertas…
                    </div>
                  ) : (
                    <>
                      <SelectField
                        value={selectedNeedKey}
                        onChange={setSelectedNeedKey}
                        options={needOptions}
                        disabled={saving}
                        menuZIndex={1400}
                      />
                      {openNeeds.length === 0 && selectedNeedKey !== MANUAL_SUPPLY_NEED_KEY && (
                        <p className="mt-1 text-[10px] text-amber-700">
                          No hay necesidades pendientes en este centro. Puede registrar otro ítem.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {!isNeed && !activeCenterId && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Seleccione primero el centro de acopio para ver las necesidades abiertas.
                </p>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Fecha del movimiento
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Día al que corresponde la necesidad o recepción. Por defecto, hoy.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Clasificación
                </label>
                <SupplyCategoryField
                  categories={categories}
                  value={categoryName}
                  onChange={setCategoryName}
                  disabled={loading || saving || linkedToNeed}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ítem
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  readOnly={linkedToNeed}
                  placeholder="Ej.: Paracetamol, guantes M…"
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 ${
                    linkedToNeed ? 'cursor-default text-slate-600' : ''
                  }`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                />
                {!isNeed && receptionProjection && selectedNeed && (
                  <div
                    className={`mt-2 rounded-xl border px-3 py-2.5 text-xs ${
                      receptionProjection.surplus > 0
                        ? 'border-sky-200 bg-sky-50 text-sky-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <p>
                      Faltaban <span className="font-bold">{formatQty(receptionProjection.pendingBefore)}</span>
                      {' · '}
                      recibe <span className="font-bold">{formatQty(receptionProjection.quantityReceived)}</span>
                    </p>
                    {receptionProjection.surplus > 0 ? (
                      <p className="mt-1 font-semibold">
                        Superávit: {formatQty(receptionProjection.surplus)} unidades de exceso
                      </p>
                    ) : (
                      <p className="mt-1 font-semibold">
                        Quedarán faltando {formatQty(receptionProjection.pendingAfter)} unidades
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              saving ||
              !itemName.trim() ||
              !quantity ||
              !entryDate ||
              !categoryName.trim() ||
              (!presetCenter && !selectedCenterId) ||
              (!isNeed && !selectedNeedKey)
            }
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 ${
              isNeed ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Guardar
          </button>
        </div>
      </motion.form>
    </div>
  );
}
