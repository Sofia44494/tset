import { useEffect, useMemo, useState } from 'react';

type WorkspaceId = 'overview' | 'transport' | 'fleet' | 'erv' | 'commerce' | 'control';
type MetricTone = 'blue' | 'green' | 'amber' | 'violet';
type ShipmentStatus = 'В пути' | 'Погрузка' | 'На границе' | 'Риск' | 'Закрыта';
type AlertSeverity = 'Критично' | 'Важно' | 'Планово';
type WagonStatus = 'Готов' | 'В рейсе' | 'ТО' | 'Ограничение';

type Metric = {
  label: string;
  value: string;
  trend: string;
  caption: string;
  tone: MetricTone;
};

type RouteStage = {
  label: string;
  complete: number;
  amount: string;
};

type Shipment = {
  id: string;
  client: string;
  route: string;
  cargo: string;
  status: ShipmentStatus | string;
  eta: string;
  value: string;
  reliability: number;
};

type FleetItem = {
  type: string;
  available: number;
  total: number;
  utilization: number;
  service: string;
};

type Terminal = {
  name: string;
  city: string;
  load: number;
  dwell: string;
  slots: string;
};

type Alert = {
  title: string;
  severity: AlertSeverity | string;
  detail: string;
  owner: string;
};

type FinanceRow = {
  label: string;
  value: string;
  detail: string;
};

type DocumentRow = {
  title: string;
  count: string;
  state: string;
};

type WagonRecord = {
  number: string;
  type: string;
  model: string;
  owner: string;
  operator: string;
  registration: string;
  depot: string;
  status: WagonStatus | string;
  currentStation: string;
  nextRepair: string;
  payload: string;
  tare: string;
  grossMass: string;
  volume: string;
  length: string;
  axleLoad: string;
  bogie: string;
  brake: string;
  mileage: string;
};

type WagonCharacteristic = {
  group: string;
  field: string;
  description: string;
  example: string;
  required: string;
};

type DashboardResponse = {
  metrics: Metric[];
  stages: RouteStage[];
};

const workspaces: Array<{ id: WorkspaceId; label: string; description: string }> = [
  {
    id: 'overview',
    label: 'Командный центр',
    description: 'KPI, риски и суточная сводка',
  },
  {
    id: 'transport',
    label: 'Перевозки',
    description: 'Заявки, маршруты, отправки',
  },
  {
    id: 'fleet',
    label: 'Парк',
    description: 'Вагоны, локомотивы, ТО',
  },
  {
    id: 'erv',
    label: 'ЕРВ',
    description: 'Единый реестр вагонов',
  },
  {
    id: 'commerce',
    label: 'Коммерция',
    description: 'Тарифы, счета, маржинальность',
  },
  {
    id: 'control',
    label: 'Контроль',
    description: 'Документы, SLA, безопасность',
  },
];

const shipmentStatusClass: Record<ShipmentStatus, string> = {
  'В пути': 'status status-blue',
  Погрузка: 'status status-violet',
  'На границе': 'status status-amber',
  Риск: 'status status-red',
  Закрыта: 'status status-green',
};

const severityClass: Record<AlertSeverity, string> = {
  Критично: 'severity severity-red',
  Важно: 'severity severity-amber',
  Планово: 'severity severity-blue',
};

const wagonStatusClass: Record<WagonStatus, string> = {
  Готов: 'status status-green',
  'В рейсе': 'status status-blue',
  ТО: 'status status-amber',
  Ограничение: 'status status-red',
};

function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('overview');
  const [query, setQuery] = useState('');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [routeStages, setRouteStages] = useState<RouteStage[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [fleet, setFleet] = useState<FleetItem[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [financeRows, setFinanceRows] = useState<FinanceRow[]>([]);
  const [wagonRegistry, setWagonRegistry] = useState<WagonRecord[]>([]);
  const [wagonCharacteristics, setWagonCharacteristics] = useState<WagonCharacteristic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Подключение к SQLite...');

  const activeWorkspaceTitle =
    workspaces.find((workspace) => workspace.id === activeWorkspace)?.label ?? 'Командный центр';
  const isErvWorkspace = activeWorkspace === 'erv';
  const heroTitle = isErvWorkspace
    ? 'ЕРВ: единый реестр вагонов с полной карточкой характеристик'
    : 'Единый контур управления перевозками, парком и финансами';
  const heroDescription = isErvWorkspace
    ? 'Ведите паспорт вагона, технические параметры, эксплуатационный статус, ремонтный ресурс и коммерческие ограничения в едином справочнике.'
    : 'Планируйте отправки, отслеживайте вагоны, контролируйте SLA, документы и доходность маршрутов в одном интерфейсе.';

  useEffect(() => {
    void refreshEverything();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadShipments(query);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  async function refreshEverything() {
    setIsLoading(true);

    try {
      const [dashboard, shipmentRows, fleetRows, terminalRows, alertRows, documentRows, finance, wagons, characteristics] =
        await Promise.all([
          requestJson<DashboardResponse>('/api/dashboard'),
          requestJson<Shipment[]>(`/api/shipments?search=${encodeURIComponent(query)}`),
          requestJson<FleetItem[]>('/api/fleet'),
          requestJson<Terminal[]>('/api/terminals'),
          requestJson<Alert[]>('/api/alerts'),
          requestJson<DocumentRow[]>('/api/documents'),
          requestJson<FinanceRow[]>('/api/finance'),
          requestJson<WagonRecord[]>('/api/wagons'),
          requestJson<WagonCharacteristic[]>('/api/wagon-characteristics'),
        ]);

      setMetrics(dashboard.metrics);
      setRouteStages(dashboard.stages);
      setShipments(shipmentRows);
      setFleet(fleetRows);
      setTerminals(terminalRows);
      setAlerts(alertRows);
      setDocuments(documentRows);
      setFinanceRows(finance);
      setWagonRegistry(wagons);
      setWagonCharacteristics(characteristics);
      setStatusMessage('Данные загружены из SQLite БД');
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadShipments(search: string) {
    try {
      const shipmentRows = await requestJson<Shipment[]>(
        `/api/shipments?search=${encodeURIComponent(search)}`,
      );
      setShipments(shipmentRows);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  }

  async function handleCreateShipment() {
    const client = window.prompt('Клиент для новой заявки', 'Новый клиент');

    if (client === null) {
      return;
    }

    const route = window.prompt('Маршрут', 'Москва-Товарная - Екатеринбург') ?? '';
    const cargo = window.prompt('Груз', 'Контейнеры 40 ft') ?? '';

    await runMutation('/api/shipments', {
      client,
      route,
      cargo,
      eta: '22 авг, 10:00',
      valueMln: 3.8,
      reliability: 90,
    });
  }

  async function handleCreateWagon() {
    const number = window.prompt('Номер вагона. Можно оставить пустым для автогенерации', '');

    if (number === null) {
      return;
    }

    const type = window.prompt('Род вагона', 'Полувагон') ?? '';
    const model = window.prompt('Модель вагона', '12-132-03') ?? '';
    const owner = window.prompt('Собственник', 'RailFlow Leasing') ?? '';
    const operator = window.prompt('Оператор', 'Новый оператор') ?? '';

    await runMutation('/api/wagons', {
      number,
      type,
      model,
      owner,
      operator,
      status: 'Готов',
    });
  }

  async function handleImport() {
    await runMutation(`/api/import/${isErvWorkspace ? 'asoup' : 'etran'}`);
  }

  async function runMutation(url: string, body?: unknown) {
    setIsBusy(true);
    setStatusMessage('Сохраняем изменения в БД...');

    try {
      await requestJson(url, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      await refreshEverything();
      setStatusMessage('Изменения сохранены в SQLite и интерфейс обновлен');
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Основная навигация">
        <div className="brand">
          <div className="brand-mark">RF</div>
          <div>
            <p className="eyebrow">RailFlow</p>
            <h1>ERP для ЖД перевозок</h1>
          </div>
        </div>

        <nav className="workspace-nav">
          {workspaces.map((workspace) => (
            <button
              className={workspace.id === activeWorkspace ? 'nav-item nav-item-active' : 'nav-item'}
              key={workspace.id}
              onClick={() => setActiveWorkspace(workspace.id)}
              type="button"
            >
              <span>{workspace.label}</span>
              <small>{workspace.description}</small>
            </button>
          ))}
        </nav>

        <section className="dispatcher-card">
          <p className="eyebrow">Диспетчер онлайн</p>
          <h2>SQLite API</h2>
          <p>Все KPI, реестры и справочники загружаются через backend из локальной БД.</p>
          <button className="ghost-button" onClick={() => void refreshEverything()} type="button">
            Обновить из БД
          </button>
        </section>
      </aside>

      <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">Рабочая область: {activeWorkspaceTitle}</p>
            <h2>{heroTitle}</h2>
            <p>{heroDescription}</p>
            <div className="action-message" aria-live="polite">
              {isLoading ? 'Загрузка данных из БД...' : statusMessage}
            </div>
          </div>
          <div className="hero-actions">
            <button
              className="primary-button"
              disabled={isBusy}
              onClick={() => void (isErvWorkspace ? handleCreateWagon() : handleCreateShipment())}
              type="button"
            >
              {isErvWorkspace ? 'Добавить вагон' : 'Создать заявку'}
            </button>
            <button
              className="secondary-button"
              disabled={isBusy}
              onClick={() => void handleImport()}
              type="button"
            >
              {isErvWorkspace ? 'Импорт из АСОУП' : 'Импорт из ЭТРАН'}
            </button>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Ключевые показатели">
          {metrics.length > 0 ? (
            metrics.map((metric) => (
              <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <span>
                  {metric.trend} · {metric.caption}
                </span>
              </article>
            ))
          ) : (
            <article className="metric-card metric-blue">
              <p>Статистика</p>
              <strong>БД</strong>
              <span>ожидание ответа backend API</span>
            </article>
          )}
        </section>

        {isErvWorkspace ? (
          <ErvWorkspace
            wagonCharacteristics={wagonCharacteristics}
            wagonRegistry={wagonRegistry}
          />
        ) : (
          <>
            <section className="workspace-grid">
              <div className="panel panel-large">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Операционная воронка</p>
                    <h3>Жизненный цикл перевозки</h3>
                  </div>
                  <span className="live-badge">DB live</span>
                </div>
                <div className="stage-list">
                  {routeStages.map((stage) => (
                    <div className="stage-row" key={stage.label}>
                      <div>
                        <strong>{stage.label}</strong>
                        <span>{stage.amount}</span>
                      </div>
                      <ProgressBar value={stage.complete} />
                      <b>{stage.complete}%</b>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Риски и SLA</p>
                    <h3>Центр реагирования</h3>
                  </div>
                </div>
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <article className="alert-card" key={alert.title}>
                      <div>
                        <span className={getSeverityClass(alert.severity)}>{alert.severity}</span>
                        <h4>{alert.title}</h4>
                      </div>
                      <p>{alert.detail}</p>
                      <small>{alert.owner}</small>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header panel-header-stacked">
                <div>
                  <p className="eyebrow">Реестр перевозок</p>
                  <h3>Активные заявки и рейсы</h3>
                </div>
                <label className="search-box">
                  <span>Поиск в БД</span>
                  <input
                    aria-label="Поиск по перевозкам"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Клиент, маршрут, груз или статус"
                    value={query}
                  />
                </label>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Заявка</th>
                      <th>Клиент</th>
                      <th>Маршрут</th>
                      <th>Груз</th>
                      <th>ETA</th>
                      <th>Сумма</th>
                      <th>Надежность</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr key={shipment.id}>
                        <td>
                          <strong>{shipment.id}</strong>
                        </td>
                        <td>{shipment.client}</td>
                        <td>{shipment.route}</td>
                        <td>{shipment.cargo}</td>
                        <td>{shipment.eta}</td>
                        <td>{shipment.value}</td>
                        <td>
                          <div className="reliability">
                            <ProgressBar value={shipment.reliability} compact />
                            <span>{shipment.reliability}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={getShipmentStatusClass(shipment.status)}>
                            {shipment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="module-grid">
              <FleetPanel fleet={fleet} />
              <TerminalsPanel terminals={terminals} />
              <FinancePanel financeRows={financeRows} />
              <DocumentsPanel documents={documents} />
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function ErvWorkspace({
  wagonCharacteristics,
  wagonRegistry,
}: {
  wagonCharacteristics: WagonCharacteristic[];
  wagonRegistry: WagonRecord[];
}) {
  const characteristicGroups = useMemo(() => {
    const groups = new Map<string, number>();

    wagonCharacteristics.forEach((characteristic) => {
      groups.set(characteristic.group, (groups.get(characteristic.group) ?? 0) + 1);
    });

    return Array.from(groups.entries()).map(([group, count]) => ({ group, count }));
  }, [wagonCharacteristics]);

  return (
    <>
      <section className="erv-summary-grid">
        <article className="panel erv-summary-card">
          <p className="eyebrow">ЕРВ</p>
          <strong>{wagonRegistry.length}</strong>
          <span>вагонов в SQLite</span>
        </article>
        <article className="panel erv-summary-card">
          <p className="eyebrow">Поля паспорта</p>
          <strong>{wagonCharacteristics.length}</strong>
          <span>характеристик из БД</span>
        </article>
        <article className="panel erv-summary-card">
          <p className="eyebrow">Контроль ремонта</p>
          <strong>{wagonRegistry.filter((wagon) => wagon.nextRepair).length}</strong>
          <span>записей с планом ТО</span>
        </article>
      </section>

      <section className="erv-grid">
        <div className="panel panel-large">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Единый реестр вагонов</p>
              <h3>Карточки подвижного состава</h3>
            </div>
            <span className="live-badge">АСОУП sync</span>
          </div>
          <div className="wagon-card-grid">
            {wagonRegistry.map((wagon) => (
              <article className="wagon-card" key={wagon.number}>
                <div className="wagon-card-head">
                  <div>
                    <span className="wagon-number">{wagon.number}</span>
                    <h4>
                      {wagon.type} · {wagon.model}
                    </h4>
                  </div>
                  <span className={getWagonStatusClass(wagon.status)}>{wagon.status}</span>
                </div>
                <dl className="wagon-details">
                  <div>
                    <dt>Собственник</dt>
                    <dd>{wagon.owner}</dd>
                  </div>
                  <div>
                    <dt>Оператор</dt>
                    <dd>{wagon.operator}</dd>
                  </div>
                  <div>
                    <dt>Депо</dt>
                    <dd>{wagon.depot}</dd>
                  </div>
                  <div>
                    <dt>Станция</dt>
                    <dd>{wagon.currentStation}</dd>
                  </div>
                  <div>
                    <dt>Грузоподъемность</dt>
                    <dd>{wagon.payload}</dd>
                  </div>
                  <div>
                    <dt>Следующий ремонт</dt>
                    <dd>{wagon.nextRepair}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Группы полей</p>
              <h3>Структура паспорта</h3>
            </div>
          </div>
          <div className="character-group-list">
            {characteristicGroups.map(({ group, count }) => (
              <div className="character-group-card" key={group}>
                <strong>{group}</strong>
                <span>{count} полей</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Расширенная таблица</p>
            <h3>Основные характеристики вагонов из БД</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table className="wagon-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Род</th>
                <th>Модель</th>
                <th>Собственник</th>
                <th>Оператор</th>
                <th>Регистрация</th>
                <th>Депо</th>
                <th>Станция</th>
                <th>Грузоподъемность</th>
                <th>Тара</th>
                <th>Брутто</th>
                <th>Объем</th>
                <th>Длина</th>
                <th>Осевая нагрузка</th>
                <th>Тележка</th>
                <th>Тормоз</th>
                <th>Пробег</th>
                <th>Ремонт</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {wagonRegistry.map((wagon) => (
                <tr key={wagon.number}>
                  <td>
                    <strong>{wagon.number}</strong>
                  </td>
                  <td>{wagon.type}</td>
                  <td>{wagon.model}</td>
                  <td>{wagon.owner}</td>
                  <td>{wagon.operator}</td>
                  <td>{wagon.registration}</td>
                  <td>{wagon.depot}</td>
                  <td>{wagon.currentStation}</td>
                  <td>{wagon.payload}</td>
                  <td>{wagon.tare}</td>
                  <td>{wagon.grossMass}</td>
                  <td>{wagon.volume}</td>
                  <td>{wagon.length}</td>
                  <td>{wagon.axleLoad}</td>
                  <td>{wagon.bogie}</td>
                  <td>{wagon.brake}</td>
                  <td>{wagon.mileage}</td>
                  <td>{wagon.nextRepair}</td>
                  <td>
                    <span className={getWagonStatusClass(wagon.status)}>{wagon.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Справочник характеристик</p>
            <h3>Все поля карточки вагона с описаниями из БД</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table className="characteristics-table">
            <thead>
              <tr>
                <th>Группа</th>
                <th>Поле</th>
                <th>Описание</th>
                <th>Пример</th>
                <th>Обязательное</th>
              </tr>
            </thead>
            <tbody>
              {wagonCharacteristics.map((characteristic) => (
                <tr key={`${characteristic.group}-${characteristic.field}`}>
                  <td>{characteristic.group}</td>
                  <td>
                    <strong>{characteristic.field}</strong>
                  </td>
                  <td>{characteristic.description}</td>
                  <td>{characteristic.example}</td>
                  <td>{characteristic.required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FleetPanel({ fleet }: { fleet: FleetItem[] }) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Парк</p>
          <h3>Доступность вагонов</h3>
        </div>
      </div>
      <div className="compact-list">
        {fleet.map((item) => (
          <div className="fleet-row" key={item.type}>
            <div>
              <strong>{item.type}</strong>
              <span>
                {item.available} из {item.total} доступно · {item.service}
              </span>
            </div>
            <ProgressBar value={item.utilization} />
          </div>
        ))}
      </div>
    </article>
  );
}

function TerminalsPanel({ terminals }: { terminals: Terminal[] }) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Инфраструктура</p>
          <h3>Терминалы и станции</h3>
        </div>
      </div>
      <div className="terminal-map">
        {terminals.map((terminal) => (
          <div className="terminal-card" key={terminal.name}>
            <div>
              <strong>{terminal.name}</strong>
              <span>{terminal.city}</span>
            </div>
            <ProgressBar value={terminal.load} compact />
            <small>
              Загрузка {terminal.load}% · Простой {terminal.dwell} · {terminal.slots}
            </small>
          </div>
        ))}
      </div>
    </article>
  );
}

function FinancePanel({ financeRows }: { financeRows: FinanceRow[] }) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Коммерция</p>
          <h3>Финансовый контур</h3>
        </div>
      </div>
      <div className="finance-grid">
        {financeRows.map((row) => (
          <div className="finance-card" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.detail}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function DocumentsPanel({ documents }: { documents: DocumentRow[] }) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Документы</p>
          <h3>ЭДО и контроль закрытия</h3>
        </div>
      </div>
      <div className="document-list">
        {documents.map((document) => (
          <div className="document-row" key={document.title}>
            <div>
              <strong>{document.title}</strong>
              <span>{document.state}</span>
            </div>
            <b>{document.count}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

function ProgressBar({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div className={compact ? 'progress progress-compact' : 'progress'}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

function getShipmentStatusClass(status: string) {
  return shipmentStatusClass[status as ShipmentStatus] ?? 'status status-blue';
}

function getSeverityClass(severity: string) {
  return severityClass[severity as AlertSeverity] ?? 'severity severity-blue';
}

function getWagonStatusClass(status: string) {
  return wagonStatusClass[status as WagonStatus] ?? 'status status-blue';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `Ошибка: ${error.message}`;
  }

  return 'Неизвестная ошибка при обращении к API';
}

export default App;
