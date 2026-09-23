create index if not exists traffic_candidates_promoted_creative_idx
  on alliance_data.traffic_content_candidates(promoted_creative_id)
  where promoted_creative_id is not null;

create index if not exists traffic_tests_created_by_idx
  on alliance_data.traffic_tests(created_by)
  where created_by is not null;
