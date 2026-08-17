import cors from 'cors';
import Database from 'better-sqlite3';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'railflow.db');
const port = Number(process.env.PORT ?? 4174);

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const app = express();
app.use(cors());
app.use(express.json());

createSchema();
seedDatabase();

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    database: dbPath,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/dashboard', (_request, response) => {
  const shipmentStats = db
    .prepare(
      `
        SELECT
          COUNT(*) AS total,
          ROUND(AVG(reliability), 1) AS sla,
          ROUND(SUM(value_mln), 1) AS revenue,
          SUM(CASE WHEN status = 'Риск' THEN 1 ELSE 0 END) AS risks
        FROM shipments
        WHERE status != 'Закрыта'
      `,
    )
    .get();

  response.json({
    metrics: [
      {
        label: 'Активные отправки',
        value: formatInteger(shipmentStats.total),
        trend: '+12,8%',
        caption: 'из БД перевозок',
        tone: 'blue',
      },
      {
        label: 'Выполнение SLA',
        value: `${shipmentStats.sla ?? 0}%`,
        trend: '+2,1 п.п.',
        caption: 'средняя надежность рейсов',
        tone: 'green',
      },
      {
        label: 'Выручка месяца',
        value: `${formatDecimal(shipmentStats.revenue)} млн ₽`,
        trend: '+38,2 млн ₽',
        caption: 'сумма активных заявок',
        tone: 'violet',
      },
      {
        label: 'Рейсы с риском',
        value: formatInteger(shipmentStats.risks),
        trend: '-9',
        caption: 'статус "Риск" в БД',
        tone: 'amber',
      },
    ],
    stages: db.prepare('SELECT label, complete, amount FROM route_stages ORDER BY position').all(),
  });
});

app.get('/api/shipments', (request, response) => {
  const search = String(request.query.search ?? '').trim().toLowerCase();
  const rows = db
    .prepare(
      `
        SELECT
          id,
          client,
          route,
          cargo,
          status,
          eta,
          printf('%.1f млн ₽', value_mln) AS value,
          reliability
        FROM shipments
        WHERE
          @search = ''
          OR lower(id || ' ' || client || ' ' || route || ' ' || cargo || ' ' || status)
             LIKE '%' || @search || '%'
        ORDER BY eta
      `,
    )
    .all({ search });

  response.json(rows);
});

app.post('/api/shipments', (request, response) => {
  const created = {
    id: createShipmentId(),
    client: normalizeText(request.body.client, 'Новый клиент'),
    route: normalizeText(request.body.route, 'Станция отправления - станция назначения'),
    cargo: normalizeText(request.body.cargo, 'Груз к перевозке'),
    status: 'Погрузка',
    eta: normalizeText(request.body.eta, '22 авг, 10:00'),
    valueMln: Number(request.body.valueMln ?? 1.5),
    reliability: Number(request.body.reliability ?? 90),
  };

  db.prepare(
    `
      INSERT INTO shipments (id, client, route, cargo, status, eta, value_mln, reliability)
      VALUES (@id, @client, @route, @cargo, @status, @eta, @valueMln, @reliability)
    `,
  ).run(created);

  response.status(201).json(created);
});

app.get('/api/fleet', (_request, response) => {
  response.json(
    db
      .prepare('SELECT type, available, total, utilization, service FROM fleet ORDER BY id')
      .all(),
  );
});

app.get('/api/finance', (_request, response) => {
  const stats = db
    .prepare(
      `
        SELECT
          ROUND(SUM(value_mln), 1) AS revenue,
          ROUND(AVG(value_mln), 1) AS averageDeal,
          ROUND(AVG(reliability), 1) AS reliability,
          COUNT(*) AS shipments
        FROM shipments
      `,
    )
    .get();

  response.json([
    {
      label: 'Доходность маршрутов',
      value: `${formatDecimal((stats.reliability ?? 0) / 4)}%`,
      detail: 'расчет по надежности и доходности заявок из БД',
    },
    {
      label: 'Портфель перевозок',
      value: `${formatDecimal(stats.revenue)} млн ₽`,
      detail: `${formatInteger(stats.shipments)} заявок в базе`,
    },
    {
      label: 'Средний чек заявки',
      value: `${formatDecimal(stats.averageDeal)} млн ₽`,
      detail: 'среднее значение по таблице shipments',
    },
    {
      label: 'Экономия на порожнем пробеге',
      value: `${formatDecimal((stats.revenue ?? 0) * 0.026)} млн ₽`,
      detail: 'модельный расчет на основании активного портфеля',
    },
  ]);
});

app.get('/api/terminals', (_request, response) => {
  response.json(
    db.prepare('SELECT name, city, load, dwell, slots FROM terminals ORDER BY id').all(),
  );
});

app.get('/api/alerts', (_request, response) => {
  response.json(
    db.prepare('SELECT title, severity, detail, owner FROM alerts ORDER BY id').all(),
  );
});

app.get('/api/documents', (_request, response) => {
  response.json(
    db.prepare('SELECT title, count, state FROM documents ORDER BY id').all(),
  );
});

app.get('/api/wagons', (_request, response) => {
  response.json(
    db
      .prepare(
        `
          SELECT
            number,
            type,
            model,
            owner,
            operator,
            registration,
            depot,
            status,
            current_station AS currentStation,
            next_repair AS nextRepair,
            payload,
            tare,
            gross_mass AS grossMass,
            volume,
            length,
            axle_load AS axleLoad,
            bogie,
            brake,
            mileage
          FROM wagons
          ORDER BY number
        `,
      )
      .all(),
  );
});

app.post('/api/wagons', (request, response) => {
  const created = {
    number: normalizeText(request.body.number, createWagonNumber()),
    type: normalizeText(request.body.type, 'Полувагон'),
    model: normalizeText(request.body.model, '12-132-03'),
    owner: normalizeText(request.body.owner, 'RailFlow Leasing'),
    operator: normalizeText(request.body.operator, 'Новый оператор'),
    registration: normalizeText(request.body.registration, 'РФ'),
    depot: normalizeText(request.body.depot, 'Депо приписки'),
    status: normalizeText(request.body.status, 'Готов'),
    currentStation: normalizeText(request.body.currentStation, 'Станция учета'),
    nextRepair: normalizeText(request.body.nextRepair, 'ТО-3 12.2026'),
    payload: normalizeText(request.body.payload, '70,0 т'),
    tare: normalizeText(request.body.tare, '23,5 т'),
    grossMass: normalizeText(request.body.grossMass, '93,5 т'),
    volume: normalizeText(request.body.volume, '88 м³'),
    length: normalizeText(request.body.length, '13 920 мм'),
    axleLoad: normalizeText(request.body.axleLoad, '23,5 тс'),
    bogie: normalizeText(request.body.bogie, '18-100'),
    brake: normalizeText(request.body.brake, 'Автоматический пневматический'),
    mileage: normalizeText(request.body.mileage, '0 км'),
  };

  db.prepare(
    `
      INSERT INTO wagons (
        number, type, model, owner, operator, registration, depot, status,
        current_station, next_repair, payload, tare, gross_mass, volume,
        length, axle_load, bogie, brake, mileage
      )
      VALUES (
        @number, @type, @model, @owner, @operator, @registration, @depot, @status,
        @currentStation, @nextRepair, @payload, @tare, @grossMass, @volume,
        @length, @axleLoad, @bogie, @brake, @mileage
      )
    `,
  ).run(created);

  response.status(201).json(created);
});

app.get('/api/wagon-characteristics', (_request, response) => {
  response.json(
    db
      .prepare(
        `
          SELECT
            group_name AS "group",
            field,
            description,
            example,
            required
          FROM wagon_characteristics
          ORDER BY id
        `,
      )
      .all(),
  );
});

app.post('/api/import/:source', (request, response) => {
  const source = normalizeText(request.params.source, 'external');
  const title = `Импорт из ${source.toUpperCase()}`;
  const detail = `Данные синхронизированы с источником ${source.toUpperCase()} и сохранены в SQLite.`;

  db.prepare(
    `
      INSERT INTO alerts (title, severity, detail, owner)
      VALUES (@title, 'Планово', @detail, 'Интеграционный модуль')
    `,
  ).run({ title, detail });

  response.status(201).json({ title, detail });
});

const distDir = path.join(rootDir, 'dist');

if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`RailFlow API started on http://localhost:${port}`);
  console.log(`SQLite database: ${dbPath}`);
});

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      client TEXT NOT NULL,
      route TEXT NOT NULL,
      cargo TEXT NOT NULL,
      status TEXT NOT NULL,
      eta TEXT NOT NULL,
      value_mln REAL NOT NULL,
      reliability INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS route_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position INTEGER NOT NULL,
      label TEXT NOT NULL,
      complete INTEGER NOT NULL,
      amount TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fleet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      available INTEGER NOT NULL,
      total INTEGER NOT NULL,
      utilization INTEGER NOT NULL,
      service TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      load INTEGER NOT NULL,
      dwell TEXT NOT NULL,
      slots TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      detail TEXT NOT NULL,
      owner TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      count TEXT NOT NULL,
      state TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wagons (
      number TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      model TEXT NOT NULL,
      owner TEXT NOT NULL,
      operator TEXT NOT NULL,
      registration TEXT NOT NULL,
      depot TEXT NOT NULL,
      status TEXT NOT NULL,
      current_station TEXT NOT NULL,
      next_repair TEXT NOT NULL,
      payload TEXT NOT NULL,
      tare TEXT NOT NULL,
      gross_mass TEXT NOT NULL,
      volume TEXT NOT NULL,
      length TEXT NOT NULL,
      axle_load TEXT NOT NULL,
      bogie TEXT NOT NULL,
      brake TEXT NOT NULL,
      mileage TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wagon_characteristics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      field TEXT NOT NULL,
      description TEXT NOT NULL,
      example TEXT NOT NULL,
      required TEXT NOT NULL
    );
  `);
}

function seedDatabase() {
  seedTable('shipments', seedShipments);
  seedTable('route_stages', seedStages);
  seedTable('fleet', seedFleet);
  seedTable('terminals', seedTerminals);
  seedTable('alerts', seedAlerts);
  seedTable('documents', seedDocuments);
  seedTable('wagons', seedWagons);
  seedTable('wagon_characteristics', seedWagonCharacteristics);
}

function seedTable(tableName, seedCallback) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();

  if (row.count === 0) {
    seedCallback();
  }
}

function seedShipments() {
  const insert = db.prepare(`
    INSERT INTO shipments (id, client, route, cargo, status, eta, value_mln, reliability)
    VALUES (@id, @client, @route, @cargo, @status, @eta, @valueMln, @reliability)
  `);

  [
    ['RF-2408-1092', 'СеверСталь Логистика', 'Череповец - Новороссийск', 'Рулонная сталь', 'В пути', '18 авг, 16:20', 18.4, 94],
    ['RF-2408-1108', 'УралХим Транс', 'Березники - Находка', 'Минеральные удобрения', 'На границе', '21 авг, 09:45', 31.7, 81],
    ['RF-2408-1127', 'СибЭнергоСнаб', 'Кемерово - Санкт-Петербург', 'Уголь энергетический', 'Погрузка', '20 авг, 22:10', 24.9, 88],
    ['RF-2408-1151', 'Восток Контейнер', 'Москва-Товарная - Владивосток', 'Контейнеры 40 ft', 'Риск', '19 авг, 04:30', 15.2, 62],
    ['RF-2408-1163', 'АгроТрейд', 'Краснодар - Екатеринбург', 'Зерно', 'Закрыта', '17 авг, 11:05', 9.6, 99],
  ].forEach(([id, client, route, cargo, status, eta, valueMln, reliability]) => {
    insert.run({ id, client, route, cargo, status, eta, valueMln, reliability });
  });
}

function seedStages() {
  const insert = db.prepare(`
    INSERT INTO route_stages (position, label, complete, amount)
    VALUES (@position, @label, @complete, @amount)
  `);

  [
    [1, 'Заявка', 100, '286 новых'],
    [2, 'План', 92, '241 согласовано'],
    [3, 'Подача', 76, '184 вагона'],
    [4, 'В пути', 68, '1 284 отправки'],
    [5, 'Акты', 57, '936 закрыто'],
  ].forEach(([position, label, complete, amount]) => {
    insert.run({ position, label, complete, amount });
  });
}

function seedFleet() {
  const insert = db.prepare(`
    INSERT INTO fleet (type, available, total, utilization, service)
    VALUES (@type, @available, @total, @utilization, @service)
  `);

  [
    ['Полувагоны', 842, 1120, 91, '36 на ТО'],
    ['Крытые вагоны', 316, 428, 84, '18 на ТО'],
    ['Платформы', 205, 278, 88, '9 на ТО'],
    ['Цистерны', 174, 235, 79, '14 на ТО'],
  ].forEach(([type, available, total, utilization, service]) => {
    insert.run({ type, available, total, utilization, service });
  });
}

function seedTerminals() {
  const insert = db.prepare(`
    INSERT INTO terminals (name, city, load, dwell, slots)
    VALUES (@name, @city, @load, @dwell, @slots)
  `);

  [
    ['Южный хаб', 'Ростов-на-Дону', 78, '7ч 20м', '18 свободно'],
    ['Балтийский терминал', 'Санкт-Петербург', 64, '5ч 45м', '31 свободно'],
    ['Сибирский узел', 'Новосибирск', 86, '9ч 10м', '12 свободно'],
  ].forEach(([name, city, load, dwell, slots]) => {
    insert.run({ name, city, load, dwell, slots });
  });
}

function seedAlerts() {
  const insert = db.prepare(`
    INSERT INTO alerts (title, severity, detail, owner)
    VALUES (@title, @severity, @detail, @owner)
  `);

  [
    ['Задержка согласования станции перехода', 'Критично', 'RF-2408-1151 требует подтверждения окна на участке Тайшет - Иркутск.', 'Диспетчерская смена A'],
    ['Пик погрузки на Сибирском узле', 'Важно', 'Ожидается превышение плановой нагрузки на 14% в течение 6 часов.', 'Операционный директор'],
    ['Плановое ТО платформ', 'Планово', '9 платформ нужно вывести из оборота до конца суток без влияния на SLA.', 'Служба парка'],
  ].forEach(([title, severity, detail, owner]) => {
    insert.run({ title, severity, detail, owner });
  });
}

function seedDocuments() {
  const insert = db.prepare(`
    INSERT INTO documents (title, count, state)
    VALUES (@title, @count, @state)
  `);

  [
    ['ЖД накладные', '1 042', '98% подписано'],
    ['Акты выполненных работ', '936', '74 ожидают ЭДО'],
    ['Сертификаты груза', '318', '12 на проверке'],
    ['Претензии', '21', '6 требуют ответа'],
  ].forEach(([title, count, state]) => {
    insert.run({ title, count, state });
  });
}

function seedWagons() {
  const insert = db.prepare(`
    INSERT INTO wagons (
      number, type, model, owner, operator, registration, depot, status,
      current_station, next_repair, payload, tare, gross_mass, volume,
      length, axle_load, bogie, brake, mileage
    )
    VALUES (
      @number, @type, @model, @owner, @operator, @registration, @depot, @status,
      @currentStation, @nextRepair, @payload, @tare, @grossMass, @volume,
      @length, @axleLoad, @bogie, @brake, @mileage
    )
  `);

  [
    ['52563418', 'Полувагон', '12-132-03', 'RailFlow Leasing', 'СеверСталь Логистика', 'РФ', 'Вологда', 'В рейсе', 'Лоста', 'КР 12.2028', '70,0 т', '23,5 т', '93,5 т', '88 м³', '13 920 мм', '23,5 тс', '18-100', 'Автоматический пневматический', '142 810 км'],
    ['53820177', 'Крытый вагон', '11-280', 'ТрансКонтур', 'АгроТрейд', 'РФ', 'Батайск', 'Готов', 'Краснодар-Сорт.', 'ДР 03.2027', '68,0 т', '24,2 т', '92,2 т', '120 м³', '15 720 мм', '23,0 тс', '18-100', 'Пневматический с авторежимом', '98 430 км'],
    ['94760544', 'Платформа', '13-2114', 'Восток Контейнер', 'Восток Контейнер', 'РФ', 'Москва-Товарная', 'Ограничение', 'Тайшет', 'ТО-3 08.2026', '72,0 т', '21,8 т', '93,8 т', 'Контейнерная база', '19 620 мм', '23,5 тс', '18-9855', 'Автоматический пневматический', '211 020 км'],
    ['73014826', 'Цистерна', '15-150-04', 'УралХим Транс', 'УралХим Транс', 'РФ', 'Березники', 'ТО', 'Пермь-Сорт.', 'ДР 09.2026', '66,0 т', '27,4 т', '93,4 т', '73 м³', '12 020 мм', '23,5 тс', '18-100', 'Пневматический с раздельным торможением', '176 550 км'],
  ].forEach(
    ([
      number,
      type,
      model,
      owner,
      operator,
      registration,
      depot,
      status,
      currentStation,
      nextRepair,
      payload,
      tare,
      grossMass,
      volume,
      length,
      axleLoad,
      bogie,
      brake,
      mileage,
    ]) => {
      insert.run({
        number,
        type,
        model,
        owner,
        operator,
        registration,
        depot,
        status,
        currentStation,
        nextRepair,
        payload,
        tare,
        grossMass,
        volume,
        length,
        axleLoad,
        bogie,
        brake,
        mileage,
      });
    },
  );
}

function seedWagonCharacteristics() {
  const insert = db.prepare(`
    INSERT INTO wagon_characteristics (group_name, field, description, example, required)
    VALUES (@group, @field, @description, @example, @required)
  `);

  [
    ['Идентификация', 'Номер вагона', 'Уникальный восьмизначный номер единицы подвижного состава.', '52563418', 'Да'],
    ['Идентификация', 'Род вагона', 'Классификация по назначению: полувагон, крытый, платформа, цистерна и т.д.', 'Полувагон', 'Да'],
    ['Идентификация', 'Модель', 'Заводское обозначение модели, определяющее конструктивные характеристики.', '12-132-03', 'Да'],
    ['Идентификация', 'Собственник', 'Юридическое лицо, которому принадлежит вагон.', 'RailFlow Leasing', 'Да'],
    ['Идентификация', 'Оператор', 'Компания, управляющая коммерческой эксплуатацией вагона.', 'СеверСталь Логистика', 'Да'],
    ['Идентификация', 'Страна регистрации', 'Государство учета вагона в железнодорожной администрации.', 'РФ', 'Да'],
    ['Идентификация', 'Депо приписки', 'Базовое депо обслуживания и учета вагона.', 'Вологда', 'Да'],
    ['Идентификация', 'Дата постройки', 'Дата выпуска вагона заводом-изготовителем.', '14.05.2018', 'Да'],
    ['Идентификация', 'Завод-изготовитель', 'Предприятие, выпустившее вагон.', 'УВЗ', 'Да'],
    ['Идентификация', 'Срок службы', 'Нормативный срок эксплуатации с учетом продлений ресурса.', '32 года', 'Да'],
    ['Технические параметры', 'Грузоподъемность', 'Максимальная масса груза, разрешенная к перевозке в вагоне.', '70,0 т', 'Да'],
    ['Технические параметры', 'Тара', 'Собственная масса порожнего вагона.', '23,5 т', 'Да'],
    ['Технические параметры', 'Полная масса брутто', 'Сумма тары и максимально допустимой массы груза.', '93,5 т', 'Да'],
    ['Технические параметры', 'Объем кузова или котла', 'Полезный объем для размещения груза, контейнера или наливного продукта.', '88 м³', 'Да'],
    ['Технические параметры', 'Длина по осям автосцепки', 'Габаритная длина вагона для расчета состава и станционных путей.', '13 920 мм', 'Да'],
    ['Технические параметры', 'База вагона', 'Расстояние между центрами шкворневых узлов тележек.', '8 650 мм', 'Да'],
    ['Технические параметры', 'Количество осей', 'Число колесных осей, влияющее на допустимую нагрузку и тарифные расчеты.', '4', 'Да'],
    ['Технические параметры', 'Нагрузка на ось', 'Максимально допустимая нагрузка от оси на рельсы.', '23,5 тс', 'Да'],
    ['Технические параметры', 'Модель тележки', 'Тип тележки, установленной на вагоне.', '18-100', 'Да'],
    ['Технические параметры', 'Тип тормоза', 'Конфигурация тормозной системы и наличие авторежима.', 'Автоматический пневматический', 'Да'],
    ['Технические параметры', 'Тип автосцепки', 'Модель сцепного устройства для совместимости в составе.', 'СА-3', 'Да'],
    ['Технические параметры', 'Габарит', 'Допустимый контур размещения вагона и груза на инфраструктуре.', '1-Т', 'Да'],
    ['Технические параметры', 'Высота', 'Максимальная высота вагона от уровня головки рельса.', '3 760 мм', 'Нет'],
    ['Технические параметры', 'Ширина', 'Максимальная ширина кузова или платформы.', '3 220 мм', 'Нет'],
    ['Эксплуатация', 'Текущее состояние', 'Операционный статус вагона: готов, в рейсе, на ТО, под ограничением.', 'В рейсе', 'Да'],
    ['Эксплуатация', 'Текущая станция', 'Последняя подтвержденная станция дислокации вагона.', 'Лоста', 'Да'],
    ['Эксплуатация', 'Последняя операция', 'Последнее событие с вагоном: погрузка, выгрузка, перестановка, осмотр.', 'Прибытие на станцию', 'Да'],
    ['Эксплуатация', 'Дата последней операции', 'Время фиксации последнего события по вагону.', '17.08.2026 08:40', 'Да'],
    ['Эксплуатация', 'Пробег', 'Накопленный пробег вагона для контроля ресурса и ремонтов.', '142 810 км', 'Да'],
    ['Эксплуатация', 'Остаток до ремонта', 'Доступный ресурс по пробегу или времени до следующего ремонта.', '38 000 км', 'Да'],
    ['Эксплуатация', 'Следующий ремонт', 'Тип и срок ближайшего планового ремонта или ТО.', 'КР 12.2028', 'Да'],
    ['Эксплуатация', 'Ремонтные ограничения', 'Ограничения эксплуатации из-за дефектов, предписаний или ремонта.', 'Запрет погрузки до ТО-3', 'Нет'],
    ['Эксплуатация', 'Разрешенные грузы', 'Номенклатура грузов, допустимых к перевозке в данном вагоне.', 'Металл, уголь, щебень', 'Да'],
    ['Эксплуатация', 'Запрещенные грузы', 'Грузы, несовместимые с конструкцией, остатками или санитарными требованиями.', 'Пищевые грузы после химии', 'Нет'],
    ['Коммерция и контроль', 'Договор аренды', 'Связанный договор использования вагона оператором или клиентом.', 'RL-24/088', 'Нет'],
    ['Коммерция и контроль', 'Ставка аренды', 'Суточная или рейсовая ставка использования вагона.', '2 850 ₽/сутки', 'Нет'],
    ['Коммерция и контроль', 'Коэффициент использования', 'Доля времени, когда вагон находится в доходной эксплуатации.', '91%', 'Да'],
    ['Коммерция и контроль', 'GPS/ГЛОНАСС', 'Наличие телематического устройства и статус передачи координат.', 'Активен', 'Нет'],
    ['Коммерция и контроль', 'Пломбы', 'Номера и состояние пломб для контроля сохранности груза.', 'RF883201, целая', 'Нет'],
    ['Коммерция и контроль', 'Примечание', 'Свободное поле для диспетчерских, технических и клиентских комментариев.', 'Требуется мойка после выгрузки', 'Нет'],
  ].forEach(([group, field, description, example, required]) => {
    insert.run({ group, field, description, example, required });
  });
}

function createShipmentId() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RF-${year}${month}-${random}`;
}

function createWagonNumber() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function normalizeText(value, fallback) {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function formatInteger(value) {
  return Number(value ?? 0).toLocaleString('ru-RU');
}

function formatDecimal(value) {
  return Number(value ?? 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
