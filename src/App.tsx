import { useMemo, useState } from 'react';

type WorkspaceId = 'overview' | 'transport' | 'fleet' | 'commerce' | 'control';
type ShipmentStatus = 'В пути' | 'Погрузка' | 'На границе' | 'Риск' | 'Закрыта';
type AlertSeverity = 'Критично' | 'Важно' | 'Планово';

type Metric = {
  label: string;
  value: string;
  trend: string;
  caption: string;
  tone: 'blue' | 'green' | 'amber' | 'violet';
};

type Shipment = {
  id: string;
  client: string;
  route: string;
  cargo: string;
  status: ShipmentStatus;
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
  severity: AlertSeverity;
  detail: string;
  owner: string;
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

const metrics: Metric[] = [
  {
    label: 'Активные отправки',
    value: '1 284',
    trend: '+12,8%',
    caption: 'к прошлой неделе',
    tone: 'blue',
  },
  {
    label: 'Выполнение SLA',
    value: '96,4%',
    trend: '+2,1 п.п.',
    caption: 'по срокам доставки',
    tone: 'green',
  },
  {
    label: 'Выручка месяца',
    value: '482,6 млн ₽',
    trend: '+38,2 млн ₽',
    caption: 'закрыто актами',
    tone: 'violet',
  },
  {
    label: 'Рейсы с риском',
    value: '27',
    trend: '-9',
    caption: 'после диспетчеризации',
    tone: 'amber',
  },
];

const shipments: Shipment[] = [
  {
    id: 'RF-2408-1092',
    client: 'СеверСталь Логистика',
    route: 'Череповец - Новороссийск',
    cargo: 'Рулонная сталь',
    status: 'В пути',
    eta: '18 авг, 16:20',
    value: '18,4 млн ₽',
    reliability: 94,
  },
  {
    id: 'RF-2408-1108',
    client: 'УралХим Транс',
    route: 'Березники - Находка',
    cargo: 'Минеральные удобрения',
    status: 'На границе',
    eta: '21 авг, 09:45',
    value: '31,7 млн ₽',
    reliability: 81,
  },
  {
    id: 'RF-2408-1127',
    client: 'СибЭнергоСнаб',
    route: 'Кемерово - Санкт-Петербург',
    cargo: 'Уголь энергетический',
    status: 'Погрузка',
    eta: '20 авг, 22:10',
    value: '24,9 млн ₽',
    reliability: 88,
  },
  {
    id: 'RF-2408-1151',
    client: 'Восток Контейнер',
    route: 'Москва-Товарная - Владивосток',
    cargo: 'Контейнеры 40 ft',
    status: 'Риск',
    eta: '19 авг, 04:30',
    value: '15,2 млн ₽',
    reliability: 62,
  },
  {
    id: 'RF-2408-1163',
    client: 'АгроТрейд',
    route: 'Краснодар - Екатеринбург',
    cargo: 'Зерно',
    status: 'Закрыта',
    eta: '17 авг, 11:05',
    value: '9,6 млн ₽',
    reliability: 99,
  },
];

const fleet: FleetItem[] = [
  {
    type: 'Полувагоны',
    available: 842,
    total: 1120,
    utilization: 91,
    service: '36 на ТО',
  },
  {
    type: 'Крытые вагоны',
    available: 316,
    total: 428,
    utilization: 84,
    service: '18 на ТО',
  },
  {
    type: 'Платформы',
    available: 205,
    total: 278,
    utilization: 88,
    service: '9 на ТО',
  },
  {
    type: 'Цистерны',
    available: 174,
    total: 235,
    utilization: 79,
    service: '14 на ТО',
  },
];

const terminals: Terminal[] = [
  {
    name: 'Южный хаб',
    city: 'Ростов-на-Дону',
    load: 78,
    dwell: '7ч 20м',
    slots: '18 свободно',
  },
  {
    name: 'Балтийский терминал',
    city: 'Санкт-Петербург',
    load: 64,
    dwell: '5ч 45м',
    slots: '31 свободно',
  },
  {
    name: 'Сибирский узел',
    city: 'Новосибирск',
    load: 86,
    dwell: '9ч 10м',
    slots: '12 свободно',
  },
];

const routeStages = [
  { label: 'Заявка', complete: 100, amount: '286 новых' },
  { label: 'План', complete: 92, amount: '241 согласовано' },
  { label: 'Подача', complete: 76, amount: '184 вагона' },
  { label: 'В пути', complete: 68, amount: '1 284 отправки' },
  { label: 'Акты', complete: 57, amount: '936 закрыто' },
];

const financeRows = [
  { label: 'Доходность маршрутов', value: '23,8%', detail: '+4,6 п.п. к плану' },
  { label: 'Дебиторская задолженность', value: '74,1 млн ₽', detail: '18,5 млн ₽ просрочено' },
  { label: 'Средняя ставка за тонну', value: '3 920 ₽', detail: '+7,2% к июлю' },
  { label: 'Экономия на порожнем пробеге', value: '12,4 млн ₽', detail: 'за счет обратных загрузок' },
];

const alerts: Alert[] = [
  {
    title: 'Задержка согласования станции перехода',
    severity: 'Критично',
    detail: 'RF-2408-1151 требует подтверждения окна на участке Тайшет - Иркутск.',
    owner: 'Диспетчерская смена A',
  },
  {
    title: 'Пик погрузки на Сибирском узле',
    severity: 'Важно',
    detail: 'Ожидается превышение плановой нагрузки на 14% в течение 6 часов.',
    owner: 'Операционный директор',
  },
  {
    title: 'Плановое ТО платформ',
    severity: 'Планово',
    detail: '9 платформ нужно вывести из оборота до конца суток без влияния на SLA.',
    owner: 'Служба парка',
  },
];

const documents = [
  { title: 'ЖД накладные', count: '1 042', state: '98% подписано' },
  { title: 'Акты выполненных работ', count: '936', state: '74 ожидают ЭДО' },
  { title: 'Сертификаты груза', count: '318', state: '12 на проверке' },
  { title: 'Претензии', count: '21', state: '6 требуют ответа' },
];

const statusClass: Record<ShipmentStatus, string> = {
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

function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('overview');
  const [query, setQuery] = useState('');

  const filteredShipments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return shipments;
    }

    return shipments.filter((shipment) =>
      [shipment.id, shipment.client, shipment.route, shipment.cargo, shipment.status]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  const activeWorkspaceTitle =
    workspaces.find((workspace) => workspace.id === activeWorkspace)?.label ?? 'Командный центр';

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
          <h2>Смена A</h2>
          <p>24 маршрута под контролем, 3 события требуют решения до 15:00.</p>
          <button className="ghost-button" type="button">
            Открыть сменный журнал
          </button>
        </section>
      </aside>

      <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">Рабочая область: {activeWorkspaceTitle}</p>
            <h2>Единый контур управления перевозками, парком и финансами</h2>
            <p>
              Планируйте отправки, отслеживайте вагоны, контролируйте SLA, документы и доходность
              маршрутов в одном интерфейсе.
            </p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button">
              Создать заявку
            </button>
            <button className="secondary-button" type="button">
              Импорт из ЭТРАН
            </button>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Ключевые показатели">
          {metrics.map((metric) => (
            <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>
                {metric.trend} · {metric.caption}
              </span>
            </article>
          ))}
        </section>

        <section className="workspace-grid">
          <div className="panel panel-large">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Операционная воронка</p>
                <h3>Жизненный цикл перевозки</h3>
              </div>
              <span className="live-badge">live</span>
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
                    <span className={severityClass[alert.severity]}>{alert.severity}</span>
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
              <span>Поиск</span>
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
                {filteredShipments.map((shipment) => (
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
                      <span className={statusClass[shipment.status]}>{shipment.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="module-grid">
          <FleetPanel />
          <TerminalsPanel />
          <FinancePanel />
          <DocumentsPanel />
        </section>
      </section>
    </main>
  );
}

function FleetPanel() {
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

function TerminalsPanel() {
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

function FinancePanel() {
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

function DocumentsPanel() {
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

export default App;
