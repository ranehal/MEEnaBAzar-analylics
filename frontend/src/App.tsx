import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, TrendingDown, TrendingUp, SlidersHorizontal, ArrowUpDown, X,
  ListPlus, Bell, BarChart3, Flame, Heart, Activity, Loader2,
} from 'lucide-react';
import { getDataset, getProductHistory, toggleFavoriteApi } from './api';
import type { Dataset, Density, HistoryPoint, Product, WatchItem } from './types';
import {
  CURRENCY, fmtChange, fmtPrice, PLACEHOLDER_IMG,
  loadFavs, saveFavs, loadWatch, saveWatch, loadDensity, saveDensity, loadCompare, saveCompare,
} from './utils';
import Ticker from './components/Ticker';
import Sparkline from './components/Sparkline';
import MoversPanel from './components/MoversPanel';
import CategoryHeatmap from './components/CategoryHeatmap';
import WatchlistPanel from './components/WatchlistPanel';
import ItemModal from './components/ItemModal';
import CompareModal from './components/CompareModal';
import './App.css';

const UNIT_TYPES = ['kg', 'ltr', 'piece'];

type SortKey = 'name' | 'unit_price' | 'actual_price' | 'change';
type SmartFilter = 'all' | 'low' | 'drop' | 'great' | 'wait';
type Panel = 'movers' | 'heatmap' | null;

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loadError, setLoadError] = useState('');

  // filters / sort
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [unitFilters, setUnitFilters] = useState<Set<string>>(new Set(UNIT_TYPES));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all');

  // personalization
  const [density, setDensity] = useState<Density>(loadDensity());
  const [favs, setFavs] = useState<Set<number>>(new Set(loadFavs()));
  const [watch, setWatch] = useState<WatchItem[]>(loadWatch());

  // compare
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>(loadCompare());
  const [showCompare, setShowCompare] = useState(false);
  const [compareHistories, setCompareHistories] = useState<Map<number, HistoryPoint[]>>(new Map());

  // panels
  const [openPanel, setOpenPanel] = useState<Panel>(null);
  const [showWatch, setShowWatch] = useState(false);

  // item modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    getDataset()
      .then((ds) => {
        setDataset(ds);
        setFavs((prev) => {
          const merged = new Set(prev);
          ds.products.forEach((p) => {
            if (p.is_favorite) merged.add(p.id);
          });
          return merged;
        });
      })
      .catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProduct(null);
        setShowCompare(false);
        setShowWatch(false);
        setOpenPanel(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const products = useMemo(() => dataset?.products ?? [], [dataset]);
  const categories = useMemo(() => dataset?.categories ?? [], [dataset]);

  const toggleFav = useCallback(
    async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      setFavs((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        saveFavs([...next]);
        return next;
      });
      await toggleFavoriteApi(id);
    },
    [],
  );

  const setWatchItem = useCallback((productId: number, targetPrice: number) => {
    setWatch((prev) => {
      const next = prev.filter((w) => w.productId !== productId);
      next.push({ productId, targetPrice, addedAt: Date.now() });
      saveWatch(next);
      return next;
    });
  }, []);

  const removeWatch = useCallback((productId: number) => {
    setWatch((prev) => {
      const next = prev.filter((w) => w.productId !== productId);
      saveWatch(next);
      return next;
    });
  }, []);

  const setDensityPersist = (d: Density) => {
    setDensity(d);
    saveDensity(d);
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUnit = (unit: string) => {
    setUnitFilters((prev) => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit);
      else next.add(unit);
      return next;
    });
  };

  const openProduct = async (p: Product) => {
    setSelectedProduct(p);
    setSelectedHistory([]);
    if (!dataset) return;
    setHistoryLoading(true);
    const hist = await getProductHistory(p.id, dataset, p);
    setSelectedHistory(hist);
    setHistoryLoading(false);
  };

  const launchCompare = async () => {
    setShowCompare(true);
    if (!dataset) return;
    const histMap = new Map<number, HistoryPoint[]>();
    await Promise.all(
      compareIds.map(async (id) => {
        const p = products.find((x) => x.id === id);
        histMap.set(id, await getProductHistory(id, dataset, p));
      }),
    );
    setCompareHistories(histMap);
  };

  const toggleCompareSelect = (p: Product) => {
    setCompareIds((prev) => {
      let next: number[];
      if (prev.includes(p.id)) next = prev.filter((x) => x !== p.id);
      else if (prev.length < 5) next = [...prev, p.id];
      else return prev;
      saveCompare(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;

      let matchesCat = true;
      if (selectedCategories.size > 0) {
        if (selectedCategories.has(-1) && selectedCategories.size === 1) {
          matchesCat = favs.has(p.id);
        } else if (selectedCategories.has(-1)) {
          matchesCat = favs.has(p.id) || selectedCategories.has(p.category_id);
        } else {
          matchesCat = selectedCategories.has(p.category_id);
        }
      }
      if (!matchesCat) return false;
      if (!unitFilters.has(p.unit_type)) return false;

      if (smartFilter === 'low') return p.unit_price <= p.min_price;
      if (smartFilter === 'drop') return p.change < 0;
      if (smartFilter === 'great') return p.unit_price < p.avg_price * 0.9;
      if (smartFilter === 'wait') return p.unit_price > p.avg_price;
      return true;
    });

    result = [...result].sort((a, b) => {
      let va: string | number = a[sortBy];
      let vb: string | number = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [products, search, selectedCategories, unitFilters, smartFilter, sortBy, sortOrder, favs]);

  const overview = useMemo(() => {
    const atLow = products.filter((p) => p.unit_price <= p.min_price).length;
    const changes = products.filter((p) => isFinite(p.change)).map((p) => p.change);
    const avgChange = changes.length
      ? changes.reduce((a, b) => a + b, 0) / changes.length
      : 0;
    const hitAlerts = watch.filter((w) => {
      const p = products.find((x) => x.id === w.productId);
      return p && p.unit_price <= w.targetPrice;
    }).length;
    return { atLow, avgChange, hitAlerts };
  }, [products, watch]);

  const compareProducts = useMemo(
    () => compareIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[],
    [compareIds, products],
  );

  const watchMap = useMemo(() => {
    const m = new Map<number, number>();
    watch.forEach((w) => m.set(w.productId, w.targetPrice));
    return m;
  }, [watch]);

  if (loadError) {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <h1>MEENAtracker</h1>
          <p className="boot-err">Could not load data.</p>
          <p className="boot-sub">{loadError}</p>
          <p className="boot-hint">
            Start the backend (<code>uvicorn main:app</code> on :8000) or build with the static
            snapshot in <code>frontend/public/data/</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <h1>MEENAtracker</h1>
          <Loader2 className="spin" size={26} />
          <p className="boot-sub">Loading market snapshot…</p>
        </div>
      </div>
    );
  }

  const catCount = (id: number) => {
    if (id === -1) return products.filter((p) => favs.has(p.id)).length;
    return dataset.category_counts[String(id)] ?? products.filter((p) => p.category_id === id).length;
  };

  return (
    <div className="app-container" data-density={density}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="brand">MEENA<span>tracker</span></h1>
          <p className="brand-sub">bazaar market terminal</p>
        </div>

        <div className="mode-badge">
          <span className={`mode-dot ${dataset.mode}`} />
          {dataset.mode === 'live' ? 'LIVE API' : 'STATIC SNAPSHOT'}
          {dataset.generated_at && (
            <span className="mode-date">· {new Date(dataset.generated_at).toLocaleDateString()}</span>
          )}
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section-title">Categories</div>
          <div
            className={`category-item ${selectedCategories.size === 0 ? 'active' : ''}`}
            onClick={() => setSelectedCategories(new Set())}
          >
            <div className="cat-check all" />
            <span>Select All</span>
            <span className="cat-count">{products.length}</span>
          </div>
          <div
            className={`category-item fav ${selectedCategories.has(-1) ? 'active' : ''}`}
            onClick={() => toggleCategory(-1)}
          >
            <div className="cat-check fav" />
            <span>Favorites</span>
            <span className="cat-count">{catCount(-1)}</span>
          </div>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`category-item ${selectedCategories.has(cat.id) ? 'active' : ''}`}
              onClick={() => toggleCategory(cat.id)}
            >
              <div className="cat-check" />
              <span>{cat.name}</span>
              <span className="cat-count">{catCount(cat.id)}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-tools">
          <button className={`tool-btn ${openPanel === 'movers' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'movers' ? null : 'movers')}>
            <Activity size={15} /> Movers
          </button>
          <button className={`tool-btn ${openPanel === 'heatmap' ? 'active' : ''}`} onClick={() => setOpenPanel(openPanel === 'heatmap' ? null : 'heatmap')}>
            <BarChart3 size={15} /> Category health
          </button>
          <button className={`tool-btn ${showWatch ? 'active' : ''}`} onClick={() => setShowWatch(true)}>
            <Bell size={15} /> Alerts {watch.length > 0 && <span className="pill-count">{watch.length}</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Ticker products={products} />

        <div className="overview-bar">
          <div className="ov-chip">
            <span className="ov-label">Items tracked</span>
            <span className="ov-value">{products.length.toLocaleString()}</span>
          </div>
          <div className="ov-chip">
            <span className="ov-label">Categories</span>
            <span className="ov-value">{categories.length}</span>
          </div>
          <div className="ov-chip">
            <span className="ov-label">Avg move</span>
            <span className={`ov-value ${overview.avgChange <= 0 ? 'mint' : 'ember'}`}>
              {overview.avgChange <= 0 ? '▼' : '▲'} {Math.abs(overview.avgChange).toFixed(1)}%
            </span>
          </div>
          <div className="ov-chip">
            <span className="ov-label">At all-time low</span>
            <span className="ov-value mint">{overview.atLow}</span>
          </div>
          <div className="ov-chip">
            <span className="ov-label">Alerts hit</span>
            <span className={`ov-value ${overview.hitAlerts > 0 ? 'ember' : ''}`}>{overview.hitAlerts}</span>
          </div>

          <div className="ov-spacer" />

          <div className="density-group">
            <span className="ov-label">Density</span>
            {(['comfortable', 'compact', 'dense'] as Density[]).map((d) => (
              <button key={d} className={`den-btn ${density === d ? 'active' : ''}`}
                onClick={() => setDensityPersist(d)} title={d}>
                {d === 'comfortable' ? 'L' : d === 'compact' ? 'M' : 'H'}
              </button>
            ))}
          </div>
        </div>

        <header className="top-header">
          <div className="search-box">
            <Search size={17} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" />
            {search && <X size={15} onClick={() => setSearch('')} />}
          </div>

          <div className="count-chip">
            {filtered.length.toLocaleString()} <span>/ {products.length.toLocaleString()}</span>
          </div>

          <div className="filter-group">
            <span className="fg-label">Smart:</span>
            {(
              [
                ['all', 'All'],
                ['low', 'All-time low'],
                ['drop', 'Biggest drop'],
                ['great', 'Great deal'],
                ['wait', 'Wait'],
              ] as [SmartFilter, string][]
            ).map(([k, label]) => (
              <button key={k} className={`smart-btn ${smartFilter === k ? 'active' : ''}`}
                onClick={() => { setSmartFilter(k); if (k === 'low') { setSortBy('change'); setSortOrder('asc'); } }}>
                {label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="fg-label"><SlidersHorizontal size={13} /> Units:</span>
            {UNIT_TYPES.map((u) => (
              <button key={u} className={`unit-btn ${unitFilters.has(u) ? 'active' : ''}`}
                onClick={() => toggleUnit(u)}>
                {u.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="fg-label"><ArrowUpDown size={13} /> Sort:</span>
            <select className="select-box" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
              <option value="name">Name</option>
              <option value="unit_price">Per-unit price</option>
              <option value="change">% change</option>
              <option value="actual_price">Pack price</option>
            </select>
            <button className="sort-order-btn" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <button
            className={`mode-btn ${isCompareMode ? 'active' : ''}`}
            onClick={() => { setIsCompareMode((v) => !v); setCompareIds([]); saveCompare([]); }}
          >
            <ListPlus size={15} /> Compare
          </button>
        </header>

        {openPanel === 'movers' && <div className="panel-zone"><MoversPanel products={products} onSelect={openProduct} /></div>}
        {openPanel === 'heatmap' && <div className="panel-zone"><CategoryHeatmap categories={categories} products={products} selected={selectedCategories} onToggle={toggleCategory} /></div>}

        <div className="product-grid-container">
          <div className="product-grid">
            {filtered.map((product) => {
              const isSelected = compareIds.includes(product.id);
              const target = watchMap.get(product.id);
              const alertHit = target !== undefined && product.unit_price <= target;
              return (
                <div
                  key={product.id}
                  className={`product-card ${isSelected ? 'compare-selected' : ''} ${alertHit ? 'alert-hit' : ''}`}
                  onClick={() => (isCompareMode ? toggleCompareSelect(product) : openProduct(product))}
                >
                  {!isCompareMode && (
                    <button className={`fav-btn ${favs.has(product.id) ? 'on' : ''}`}
                      onClick={(e) => toggleFav(e, product.id)} aria-label="Favorite">
                      <Heart size={13} fill={favs.has(product.id) ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  {alertHit && <span className="alert-hit-badge" title="Target price reached">◉</span>}
                  {isCompareMode && isSelected && <span className="compare-tick">✓</span>}

                  <div className="product-img-wrapper">
                    <img src={product.image_url} alt={product.name} className="product-img" loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                  </div>
                  <div className="product-name" title={product.name}>{product.name}</div>

                  <div className="product-spark">
                    {product.history && product.history.length >= 2 ? (
                      <Sparkline points={product.history}
                        color={product.change <= 0 ? 'var(--mint)' : 'var(--ember)'} />
                    ) : (
                      <Sparkline
                        points={[[0, product.unit_price * 1.02, product.actual_price * 1.02], [1, product.unit_price, product.actual_price]]}
                        color="var(--dim)" fill={false} width={80} height={16} />
                    )}
                  </div>

                  <div className="product-prices">
                    <div className="price-line">
                      <span className="unit-price">{CURRENCY}{fmtPrice(product.unit_price)}</span>
                      <span className="unit-desc">/{product.unit_type}</span>
                    </div>
                    <div className="price-sub">
                      <span className="actual-price">pack {CURRENCY}{fmtPrice(product.actual_price)}</span>
                      {product.change !== 0 && (
                        <span className={`change-tag ${product.change <= 0 ? 'down' : 'up'}`}>
                          {product.change > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {fmtChange(product.change)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Flame size={30} />
              <p>No items match the current filters.</p>
              <button onClick={() => { setSelectedCategories(new Set()); setSearch(''); setSmartFilter('all'); setUnitFilters(new Set(UNIT_TYPES)); }}>
                Reset filters
              </button>
            </div>
          )}
        </div>
      </main>

      {isCompareMode && compareProducts.length > 0 && (
        <div className="compare-bar">
          <span>{compareProducts.length}/5 selected</span>
          <button className="compare-now" onClick={launchCompare}>COMPARE NOW</button>
          <button className="compare-clear" onClick={() => { setCompareIds([]); saveCompare([]); }}>Clear</button>
        </div>
      )}

      {selectedProduct && !showCompare && (
        <ItemModal
          product={selectedProduct}
          history={selectedHistory}
          isFav={favs.has(selectedProduct.id)}
          watchTarget={watchMap.get(selectedProduct.id) ?? null}
          onClose={() => setSelectedProduct(null)}
          onToggleFav={() => {
            setFavs((prev) => {
              const next = new Set(prev);
              if (next.has(selectedProduct.id)) next.delete(selectedProduct.id);
              else next.add(selectedProduct.id);
              saveFavs([...next]);
              return next;
            });
          }}
          onSaveAlert={(t) => setWatchItem(selectedProduct.id, t)}
          onRemoveAlert={() => removeWatch(selectedProduct.id)}
        />
      )}

      {showCompare && (
        <CompareModal
          products={compareProducts}
          histories={compareHistories}
          onClose={() => setShowCompare(false)}
          onOpen={openProduct}
        />
      )}

      {showWatch && (
        <WatchlistPanel
          watch={watch}
          products={products}
          onRemove={removeWatch}
          onSelect={(p) => { setShowWatch(false); openProduct(p); }}
          onClose={() => setShowWatch(false)}
        />
      )}

      {historyLoading && (
        <div className="history-loading"><Loader2 className="spin" size={16} /> loading price history…</div>
      )}
    </div>
  );
}