# Migrations

Przykladowe uruchomienie migracji:

```bash
docker compose exec db psql -U docker -d db -f /migrations/NAZWA_MIGRACJI
```

Wazne:
- `docker compose down` zostawia dane,
- `docker compose down -v` usuwa volume i kasuje cala baze,
- `init.sql` odpali sie ponownie tylko wtedy, gdy volume bazy bedzie pusty.
