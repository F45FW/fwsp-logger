const moment = require('moment');
const Promise = require('bluebird');
const ElasticSearch = require('elasticsearch');
const client = new ElasticSearch.Client({host: process.argv[2]});
const dump = obj => console.dir(obj, {colors: true, depth: null});
const chunk = require('lodash/chunk');

//client.indices.delete({index: `*.${process.argv[3]}-*`}).then(result => console.log(result));


getExpiredIndices()
  .then(expired => {
    console.log(`Deleting ${expired.length} expired indices...`);
    const first = expired[0];
    const [last] = expired.slice(-1);
    console.log({first, last});
    const failures = new Set(expired);
    let acknowledged = 0;
    return Promise.each(
      chunk(expired, 1),
      batch => deleteIndices(batch).then(results => {
        dump(results);
        results.forEach((result, i) => {
          if (result && result.acknowledged) {
            failures.delete(batch[i]);
            acknowledged++;
          }
        });
      }).then(() => ({failures, acknowledged}))
    );
  })
  .then(({failures, acknowledged}) => {
    console.log(`${acknowledged} deletions acknowledged, ${failures.size} failed`);
  })
  // .then(dump).catch(dump)
  .catch(process.error);
// .then(() => process.exit(0));

//Promise.mapSeries(getDays('2017-07-30', '2017-08-01'), doReindex).then(() => console.log('Done with all days'));

//doReindex('2017-07-30').then(() => console.log('Finished reindex'));

//doDelete('2017-09-01').then(() => countLogs('2017-07-30', '2017-10-01')).then(dump);

//countLogs('2017-07-01', moment().startOf('day').format('YYYY-MM-DD')).then(dump);

//diffCounts('2017-07-15', '2017-07-30');

//deleteIndices([baseIndex]).then(dump).catch(dump);

function getDays(start, end = moment().startOf('day')) {
  let cursor = moment(start);
  let days = [];
  while (cursor.isBefore(end)) {
    days.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'd');
  }
  return days;
}

function deleteIndices(indices) {
  console.log('Deleting indices: ' + indices.join(', '));
  const start = new Date().getTime();
  return Promise.mapSeries(indices, index => {
    console.log(`Deleting ${index}`);
    return new Promise(resolve => {
      client.indices.delete({index}, resolve);
    });
  })
    .tap(() => {
      const elapsed = (new Date().getTime() - start);
      console.log(`Done after ${elapsed} ms`);
    });
}

function diffCounts(start, end) {
  Promise.all([
    getNewCounts(),
    countLogs(start, end)
  ])
    .spread((newCounts, oldCounts) => {
      Object.keys(oldCounts).forEach(date => {
        if (!oldCounts[date]) {
          return;
        }
        if (oldCounts[date] === newCounts[date]) {
          console.log(`${date} good!`);
        } else {
          console.log(`${date} mismatch: ${oldCounts[date]} <=> ${newCounts[date]}`);
        }
      });
    });
}

function getExpiredIndices() {
  let limit = moment().startOf('day').subtract('3', 'w');
  let expired = [];
  const dates = new Set();
  return client.cat.indices({format: 'json'})
    .then(result => {
      result.forEach(index => {
        const [service, date] = index.index.split('.');
        if (!date || !/^\d\d\d\d-\d\d-\d\d$/.test(date)) {
          return;
        }
        if (moment(date).isBefore(limit)) {
          expired.push({service, date});
          dates.add(date);
        }
      });
      return expired.sort(
        (a, b) => moment(a.date) - moment(b.date)
      ).map(
        ({service, date}) => `${service}.${date}`
      );
    });
}

function getNewCounts() {
  let counts = {};
  return client.cat.indices({format: 'json'})
    .then(result => {
      result.forEach(index => {
        if (index.index.startsWith(`${baseIndex}.`)) {
          counts[index.index.split('.').pop()] = parseInt(index['docs.count']);
        }
      });
      return counts;
    });
}

function countLogs(start, end) {
  let cursor = moment(start);
  let ranges = [];
  while (cursor.isBefore(end)) {
    let prev = cursor.format('YYYY-MM-DD');
    cursor = cursor.add(1, 'd');
    ranges.push({
      start: prev,
      end: cursor.format('YYYY-MM-DD')
    });
  }
  return Promise.mapSeries(ranges, range => count(range))
    .then(results => {
      let counts = {};
      results.forEach((el, i) => counts[ranges[i].start] = el.count);
      return counts;
    });
}

function doDelete(end) {
  return client.ping({ requestTimeout: 1000 })
    .then(() => console.log('Connected to elasticsearch...  '))
    .then(() => deleteOld(end))
    .then(result => console.log(result));
}

function doReindex(start) {
  let end = moment(start).add(1, 'd').format('YYYY-MM-DD');
  return client.ping({ requestTimeout: 1000 })
    .then(() => console.log('Connected to elasticsearch...  '))

    .then(() => count({start, end}))
    .then(result => console.log(result, `Attempting re-index ${start}...`))
    .then(() => reindex(start, end))
    .then(result => console.log(result))
    .catch(err => console.log('error', err))
    .then(() => countNew(start))

    .then(result => console.log(`Finished ${start}`, result));
}


function deleteOld(end) {
  return client.deleteByQuery({
    index: baseIndex,
    type: 'log',
    body: {
      query: {
        range: {
          time: {
            lt: end,
            format: 'yyyy-MM-dd'
          }
        }
      }
    }
  });
}

function count(range) {
  return client.count({
    index: baseIndex,
    type: 'log',
    body: {
      query: {
        range: {
          time: {
            gte: range.start,
            lt: range.end,
            format: 'yyyy-MM-dd'
          }
        }
      }
    }
  });
}

function countNew(start) {
  return client.count({
    index: `${baseIndex}.${start}`,
    type: 'log'
  });
}

function reindex(start, end) {
  return client.reindex({
    body: {
      source: {
        index: baseIndex,
        type: 'log',
        query: {
          range: {
            time: {
              gte: start,
              lt: end,
              format: 'yyyy-MM-dd'
            }
          }
        }
      },
      dest: {
        index: `${baseIndex}.${start}`
      }
    }
  });
}
