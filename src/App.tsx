import { useMemo, useState } from 'react';

type WorkspaceId = 'overview' | 'transport' | 'fleet' | 'erv' | 'commerce' | 'control';
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

type WagonRecord = {
  number: string;
  type: string;
  model: string;
  owner: string;
  operator: string;
  registration: string;
  depot: string;
  status: 'Готов' | 'В рейсе' | 'ТО' | 'Ограничение';
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

const wagonRegistry: WagonRecord[] = [
  {
    number: '52563418',
    type: 'Полувагон',
    model: '12-132-03',
    owner: 'RailFlow Leasing',
    operator: 'СеверСталь Логистика',
    registration: 'РФ',
    depot: 'Вологда',
    status: 'В рейсе',
    currentStation: 'Лоста',
    nextRepair: 'КР 12.2028',
    payload: '70,0 т',
    tare: '23,5 т',
    grossMass: '93,5 т',
    volume: '88 м³',
    length: '13 920 мм',
    axleLoad: '23,5 тс',
    bogie: '18-100',
    brake: 'Автоматический пневматический',
    mileage: '142 810 км',
  },
  {
    number: '53820177',
    type: 'Крытый вагон',
    model: '11-280',
    owner: 'ТрансКонтур',
    operator: 'АгроТрейд',
    registration: 'РФ',
    depot: 'Батайск',
    status: 'Готов',
    currentStation: 'Краснодар-Сорт.',
    nextRepair: 'ДР 03.2027',
    payload: '68,0 т',
    tare: '24,2 т',
    grossMass: '92,2 т',
    volume: '120 м³',
    length: '15 720 мм',
    axleLoad: '23,0 тс',
    bogie: '18-100',
    brake: 'Пневматический с авторежимом',
    mileage: '98 430 км',
  },
  {
    number: '94760544',
    type: 'Платформа',
    model: '13-2114',
    owner: 'Восток Контейнер',
    operator: 'Восток Контейнер',
    registration: 'РФ',
    depot: 'Москва-Товарная',
    status: 'Ограничение',
    currentStation: 'Тайшет',
    nextRepair: 'ТО-3 08.2026',
    payload: '72,0 т',
    tare: '21,8 т',
    grossMass: '93,8 т',
    volume: 'Контейнерная база',
    length: '19 620 мм',
    axleLoad: '23,5 тс',
    bogie: '18-9855',
    brake: 'Автоматический пневматический',
    mileage: '211 020 км',
  },
  {
    number: '73014826',
    type: 'Цистерна',
    model: '15-150-04',
    owner: 'УралХим Транс',
    operator: 'УралХим Транс',
    registration: 'РФ',
    depot: 'Березники',
    status: 'ТО',
    currentStation: 'Пермь-Сорт.',
    nextRepair: 'ДР 09.2026',
    payload: '66,0 т',
    tare: '27,4 т',
    grossMass: '93,4 т',
    volume: '73 м³',
    length: '12 020 мм',
    axleLoad: '23,5 тс',
    bogie: '18-100',
    brake: 'Пневматический с раздельным торможением',
    mileage: '176 550 км',
  },
];

const wagonCharacteristics: WagonCharacteristic[] = [
  {
    group: 'Идентификация',
    field: 'Номер вагона',
    description: 'Уникальный восьмизначный номер единицы подвижного состава.',
    example: '52563418',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Род вагона',
    description: 'Классификация по назначению: полувагон, крытый, платформа, цистерна и т.д.',
    example: 'Полувагон',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Модель',
    description: 'Заводское обозначение модели, определяющее конструктивные характеристики.',
    example: '12-132-03',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Собственник',
    description: 'Юридическое лицо, которому принадлежит вагон.',
    example: 'RailFlow Leasing',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Оператор',
    description: 'Компания, управляющая коммерческой эксплуатацией вагона.',
    example: 'СеверСталь Логистика',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Страна регистрации',
    description: 'Государство учета вагона в железнодорожной администрации.',
    example: 'РФ',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Депо приписки',
    description: 'Базовое депо обслуживания и учета вагона.',
    example: 'Вологда',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Дата постройки',
    description: 'Дата выпуска вагона заводом-изготовителем.',
    example: '14.05.2018',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Завод-изготовитель',
    description: 'Предприятие, выпустившее вагон.',
    example: 'УВЗ',
    required: 'Да',
  },
  {
    group: 'Идентификация',
    field: 'Срок службы',
    description: 'Нормативный срок эксплуатации с учетом продлений ресурса.',
    example: '32 года',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Грузоподъемность',
    description: 'Максимальная масса груза, разрешенная к перевозке в вагоне.',
    example: '70,0 т',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Тара',
    description: 'Собственная масса порожнего вагона.',
    example: '23,5 т',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Полная масса брутто',
    description: 'Сумма тары и максимально допустимой массы груза.',
    example: '93,5 т',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Объем кузова или котла',
    description: 'Полезный объем для размещения груза, контейнера или наливного продукта.',
    example: '88 м³',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Длина по осям автосцепки',
    description: 'Габаритная длина вагона для расчета состава и станционных путей.',
    example: '13 920 мм',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'База вагона',
    description: 'Расстояние между центрами шкворневых узлов тележек.',
    example: '8 650 мм',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Количество осей',
    description: 'Число колесных осей, влияющее на допустимую нагрузку и тарифные расчеты.',
    example: '4',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Нагрузка на ось',
    description: 'Максимально допустимая нагрузка от оси на рельсы.',
    example: '23,5 тс',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Модель тележки',
    description: 'Тип тележки, установленной на вагоне.',
    example: '18-100',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Тип тормоза',
    description: 'Конфигурация тормозной системы и наличие авторежима.',
    example: 'Автоматический пневматический',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Тип автосцепки',
    description: 'Модель сцепного устройства для совместимости в составе.',
    example: 'СА-3',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Габарит',
    description: 'Допустимый контур размещения вагона и груза на инфраструктуре.',
    example: '1-Т',
    required: 'Да',
  },
  {
    group: 'Технические параметры',
    field: 'Высота',
    description: 'Максимальная высота вагона от уровня головки рельса.',
    example: '3 760 мм',
    required: 'Нет',
  },
  {
    group: 'Технические параметры',
    field: 'Ширина',
    description: 'Максимальная ширина кузова или платформы.',
    example: '3 220 мм',
    required: 'Нет',
  },
  {
    group: 'Эксплуатация',
    field: 'Текущее состояние',
    description: 'Операционный статус вагона: готов, в рейсе, на ТО, под ограничением.',
    example: 'В рейсе',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Текущая станция',
    description: 'Последняя подтвержденная станция дислокации вагона.',
    example: 'Лоста',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Последняя операция',
    description: 'Последнее событие с вагоном: погрузка, выгрузка, перестановка, осмотр.',
    example: 'Прибытие на станцию',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Дата последней операции',
    description: 'Время фиксации последнего события по вагону.',
    example: '17.08.2026 08:40',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Пробег',
    description: 'Накопленный пробег вагона для контроля ресурса и ремонтов.',
    example: '142 810 км',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Остаток до ремонта',
    description: 'Доступный ресурс по пробегу или времени до следующего ремонта.',
    example: '38 000 км',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Следующий ремонт',
    description: 'Тип и срок ближайшего планового ремонта или ТО.',
    example: 'КР 12.2028',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Ремонтные ограничения',
    description: 'Ограничения эксплуатации из-за дефектов, предписаний или ремонта.',
    example: 'Запрет погрузки до ТО-3',
    required: 'Нет',
  },
  {
    group: 'Эксплуатация',
    field: 'Разрешенные грузы',
    description: 'Номенклатура грузов, допустимых к перевозке в данном вагоне.',
    example: 'Металл, уголь, щебень',
    required: 'Да',
  },
  {
    group: 'Эксплуатация',
    field: 'Запрещенные грузы',
    description: 'Грузы, несовместимые с конструкцией, остатками или санитарными требованиями.',
    example: 'Пищевые грузы после химии',
    required: 'Нет',
  },
  {
    group: 'Коммерция и контроль',
    field: 'Договор аренды',
    description: 'Связанный договор использования вагона оператором или клиентом.',
    example: 'RL-24/088',
    required: 'Нет',
  },
  {
    group: 'Коммерция и контроль',
    field: 'Ставка аренды',
    description: 'Суточная или рейсовая ставка использования вагона.',
    example: '2 850 ₽/сутки',
    required: 'Нет',
  },
  {
    group: 'Коммерция и контроль',
    field: 'Коэффициент использования',
    description: 'Доля времени, когда вагон находится в доходной эксплуатации.',
    example: '91%',
    required: 'Да',
  },
  {
    group: 'Коммерция и контроль',
    field: 'GPS/ГЛОНАСС',
    description: 'Наличие телематического устройства и статус передачи координат.',
    example: 'Активен',
    required: 'Нет',
  },
  {
    group: 'Коммерция и контроль',
    field: 'Пломбы',
    description: 'Номера и состояние пломб для контроля сохранности груза.',
    example: 'RF883201, целая',
    required: 'Нет',
  },
  {
    group: 'Коммерция и контроль',
    field: 'Примечание',
    description: 'Свободное поле для диспетчерских, технических и клиентских комментариев.',
    example: 'Требуется мойка после выгрузки',
    required: 'Нет',
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

const wagonStatusClass: Record<WagonRecord['status'], string> = {
  Готов: 'status status-green',
  'В рейсе': 'status status-blue',
  ТО: 'status status-amber',
  Ограничение: 'status status-red',
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
  const isErvWorkspace = activeWorkspace === 'erv';
  const heroTitle = isErvWorkspace
    ? 'ЕРВ: единый реестр вагонов с полной карточкой характеристик'
    : 'Единый контур управления перевозками, парком и финансами';
  const heroDescription = isErvWorkspace
    ? 'Ведите паспорт вагона, технические параметры, эксплуатационный статус, ремонтный ресурс и коммерческие ограничения в едином справочнике.'
    : 'Планируйте отправки, отслеживайте вагоны, контролируйте SLA, документы и доходность маршрутов в одном интерфейсе.';

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
            <h2>{heroTitle}</h2>
            <p>{heroDescription}</p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button">
              {isErvWorkspace ? 'Добавить вагон' : 'Создать заявку'}
            </button>
            <button className="secondary-button" type="button">
              {isErvWorkspace ? 'Импорт из АСОУП' : 'Импорт из ЭТРАН'}
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

        {isErvWorkspace ? (
          <ErvWorkspace />
        ) : (
          <>
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
          </>
        )}
      </section>
    </main>
  );
}

function ErvWorkspace() {
  const characteristicGroups = Array.from(
    new Set(wagonCharacteristics.map((characteristic) => characteristic.group)),
  );

  return (
    <>
      <section className="erv-summary-grid">
        <article className="panel erv-summary-card">
          <p className="eyebrow">ЕРВ</p>
          <strong>{wagonRegistry.length}</strong>
          <span>вагона в витрине реестра</span>
        </article>
        <article className="panel erv-summary-card">
          <p className="eyebrow">Поля паспорта</p>
          <strong>{wagonCharacteristics.length}</strong>
          <span>характеристик с описаниями</span>
        </article>
        <article className="panel erv-summary-card">
          <p className="eyebrow">Контроль ремонта</p>
          <strong>100%</strong>
          <span>записей с планом ТО и ремонта</span>
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
                  <span className={wagonStatusClass[wagon.status]}>{wagon.status}</span>
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
            {characteristicGroups.map((group) => (
              <div className="character-group-card" key={group}>
                <strong>{group}</strong>
                <span>
                  {
                    wagonCharacteristics.filter(
                      (characteristic) => characteristic.group === group,
                    ).length
                  }{' '}
                  полей
                </span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Расширенная таблица</p>
            <h3>Основные характеристики вагонов</h3>
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
                    <span className={wagonStatusClass[wagon.status]}>{wagon.status}</span>
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
            <h3>Все поля карточки вагона с описаниями</h3>
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
