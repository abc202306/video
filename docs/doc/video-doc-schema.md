
## bilibili

### Record Schema

| order | prop-name   | type       | required | chk                     | ref            | default |
| ----- | ----------- | ---------- | -------- | ----------------------- | -------------- | ------- |
| 1     | up          | `Link[]`   | 1        |                         | collection\[\] |         |
| 2     | description | `string`   |          |                         |                |         |
| 3     | comment     | `string`   |          |                         |                |         |
| 4     | categories  | `Link[]`   |          | length(categories) == 1 | 中国图书馆分类法\[\]   |         |
| 5     | keywords    | `Link[]`   |          |                         |                |         |
| 6     | tags        | `string[]` |          |                         |                |         |
| 7     | title       | `string`   |          |                         |                |         |
| 8     | url         | `string`   |          | isURL(url)              |                |         |
| 9     | aliases     | `string[]` |          |                         |                |         |
| 10    | icon        | `Link`     |          |                         | ImageFile      |         |
| 11    | cover       | `Link`     |          |                         | ImageFile      |         |
| 12    | markeditems | `Link[]`   |          |                         |                |         |
| 13    | ctime       | `DateTime` |          |                         |                | now()   |
| 14    | mtime       | `DateTime` |          |                         |                | now()   |
| 15    | published   | `DateTime` |          |                         |                |         |
| 16    | uploaded    | `DateTime` |          |                         |                |         |


### Bilibili User Schema

| order | prop-name     | type     | required | chk | ref | default |
| ----- | ------------- | -------- | -------- | --- | --- | ------- |
| 3     | bulletin      | `string` |          |     |     |         |

### Bilibili Video Schema

| order | prop-name | type | required | chk | ref | default |
| ----- | --------- | ---- | -------- | --- | --- | ------- |


### Bilibili User Video Relation Schema

| order | prop-name     | type   | required | chk | ref                | default |
| ----- | ------------- | ------ | -------- | --- | ------------------ | ------- |
| 1     | bilibiliuser  | `Link` |          |     | [[collection-bilibili-user\|collection-bilibili-user]]  |         |
| 2     | bilibilivideo | `Link` |          |     | [[collection-bilibili-video\|collection-bilibili-video]] |         |
