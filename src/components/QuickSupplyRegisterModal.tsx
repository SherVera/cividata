import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CollectionCenter,
  listCollectionCenters,
} from '../lib/collectionCentersApi';
import {
  SupplyCategory,
  SupplyEntryType,
  createCenterSupplyEntry,
  listSupplyCategories,
} from '../lib/centerSupplyApi';
import CenterPicker from './CenterPicker';
import SelectField from './SelectField';

export const NEW_SUPPLY_CATEGORY = '__new__';

export type QuickSupplyRegisterModalProps = {
  open: boolean;
  entryType: SupplyEntryType;
  onClose: () => void;
  onSaved?: () => void;
  /** Si se indica, el centro queda fijo y no se muestra el selector. */
  presetCenter?: Pick<CollectionCenter, 'id' | 'name'>;
};

export default function QuickSupplyRegisterModal({
  open,
  entryType: initialEntryType,
  onClose,
  onSaved,
  presetCenter,
}: QuickSupplyRegisterModalProps) {
  const [entryType, setEntryType] = useState<SupplyEntryType>(initialEntryType);
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');

  const selectedCenterName = useMemo(
    () =>
      presetCenter?.name ||
      centers.find((c) => c.id === selectedCenterId)?.name ||
      '',
    [presetCenter, centers, selectedCenterId]
  );

  const formCategoryOptions = useMemo(
    () => [
      ...categories.map((c) => ({ value: c.id, label: c.name })),
      { value: NEW_SUPPLY_CATEGORY, label: '+ Nueva clasificación…' },
    ],
    [categories]
  );

  const resetFields = (type: SupplyEntryType = initialEntryType) => {
    setEntryType(type);
    setSelectedCenterId(presetCenter?.id || '');
    setCenterFilter('');
    setCategoryId('');
    setNewCategoryName('');
    setItemName('');
    setQuantity('1');
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
        const defaultCat =
          cats.find((c) => c.name.toLowerCase() === 'insumos')?.id || cats[0]?.id || '';
        setCategoryId(defaultCat);
      })
      .catch((err: any) => {
        setError(err?.message || 'No se pudo cargar el formulario.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEntryType, presetCenter?.id]);

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const centerId = presetCenter?.id || selectedCenterId;
    if (!centerId) {
      setError('Seleccione un centro de acopio.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const usingNewCategory = categoryId === NEW_SUPPLY_CATEGORY;
      await createCenterSupplyEntry({
        collectionCenterId: centerId,
        categoryId: usingNewCategory ? undefined : categoryId,
        categoryName: usingNewCategory ? newCategoryName : undefined,
        itemName,
        quantity: Number(quantity),
        entryType,
      });
      onSaved?.();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isNeed = entryType === 'necesidad';

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
            <h3 className="text-sm font-bold text-slate-900">Registro rápido</h3>
            <p className="text-[11px] text-slate-500">Sin entrar al detalle del centro</p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setEntryType('necesidad')}
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

              <div className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Clasificación
                </span>
                <SelectField
                  value={categoryId || categories[0]?.id || NEW_SUPPLY_CATEGORY}
                  onChange={setCategoryId}
                  options={formCategoryOptions}
                  size="sm"
                  accent="teal"
                />
                {categoryId === NEW_SUPPLY_CATEGORY && (
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    placeholder="Nombre de la nueva clasificación"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                  />
                )}
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
                  placeholder="Ej.: Paracetamol, guantes M…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
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
              !categoryId ||
              (categoryId === NEW_SUPPLY_CATEGORY && !newCategoryName.trim()) ||
              (!presetCenter && !selectedCenterId)
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
