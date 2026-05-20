# Migrations

`init.sql` sluzy tylko do pierwszego postawienia pustej bazy.

Po uruchomieniu projektu z trwalym volume Postgresa:
- nie edytuj juz workflowu tak, jakby `init.sql` mial odpalac sie przy kazdej zmianie,
- nowe zmiany schematu i danych testowych dodawaj jako osobne pliki SQL w tym katalogu.

Przykladowe nazwy:
- `001_add_vehicle_image_order.sql`
- `002_add_vehicle_database_primitives.sql`
- `003_add_community_foundation.sql`
- `004_add_community_post_images.sql`

Sugerowany workflow:
1. tworzysz nowy plik migracji,
2. wrzucasz do niego `ALTER TABLE`, `CREATE INDEX`, `UPDATE`, itp.,
3. odpalasz go na istniejacej bazie,
4. nie resetujesz volume i nie tracisz danych testowych.

Przykladowe uruchomienie migracji:

```bash
docker compose exec db psql -U docker -d db -f /migrations/001_add_vehicle_images_display_order.sql
```

Aktualna kolejna migracja:

```bash
docker compose exec db psql -U docker -d db -f /migrations/002_add_vehicle_database_primitives.sql
```

Kolejna migracja dla modulu community:

```bash
docker compose exec db psql -U docker -d db -f /migrations/003_add_community_foundation.sql
```

Migracja dodajaca zdjecia do postow community:

```bash
docker compose exec db psql -U docker -d db -f /migrations/004_add_community_post_images.sql
```

Wazne:
- `docker compose down` zostawia dane,
- `docker compose down -v` usuwa volume i kasuje cala baze,
- `init.sql` odpali sie ponownie tylko wtedy, gdy volume bazy bedzie pusty.
