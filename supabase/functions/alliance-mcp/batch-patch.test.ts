import { assertEquals } from 'jsr:@std/assert@1'
import { applyPresentFields, cloneBatchItem } from './batch-patch.ts'

Deno.test('batch update isolates three different task patches',()=>{
  const tasks=[
    {id:'a',priority:'normal',assignees:['Ana'],parentTaskId:'mae-a',archivedAt:null},
    {id:'b',priority:'normal',assignees:[],parentTaskId:'mae-b',archivedAt:null},
    {id:'c',priority:'baixa',assignees:['Carlos'],parentTaskId:null,archivedAt:null},
  ]
  const patches=[
    {id:'a',archivedAt:'2026-09-20T12:00:00-03:00'},
    {id:'b',priority:'alta'},
    {id:'c',assignees:['Vitor Gutierrez']},
  ].map(cloneBatchItem)

  for(const patch of patches){
    const task=tasks.find(t=>t.id===patch.id)!
    applyPresentFields(task,patch,['archivedAt','priority','assignees','parentTaskId'])
  }

  assertEquals(tasks[0],{id:'a',priority:'normal',assignees:['Ana'],parentTaskId:'mae-a',archivedAt:'2026-09-20T12:00:00-03:00'})
  assertEquals(tasks[1],{id:'b',priority:'alta',assignees:[],parentTaskId:'mae-b',archivedAt:null})
  assertEquals(tasks[2],{id:'c',priority:'baixa',assignees:['Vitor Gutierrez'],parentTaskId:null,archivedAt:null})
})
