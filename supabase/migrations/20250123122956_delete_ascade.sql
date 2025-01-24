alter table documents 
drop constraint documents_storage_object_id_fkey,
add constraint documents_storage_object_id_fkey
   foreign key (storage_object_id)
   references storage.objects(id)
   on delete cascade;