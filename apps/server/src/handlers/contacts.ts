import { ContactService } from '../services/ContactService'
import { ok, type Rep, type Req } from './_shared'

const contacts = new ContactService()

export const listContacts = async (r: Req, reply: Rep) => reply.send(await contacts.list(r.ctx, r.query))
export const createContact = async (r: Req, reply: Rep) => ok(reply, await contacts.create(r.ctx, r.body), 201)
export const matchContacts = async (r: Req, reply: Rep) => ok(reply, await contacts.match(r.ctx, r.body))
export const getContact = async (r: Req, reply: Rep) => ok(reply, await contacts.get(r.ctx, r.params.id))
export const updateContact = async (r: Req, reply: Rep) => ok(reply, await contacts.update(r.ctx, r.params.id, r.body))
export const createOpportunity = async (r: Req, reply: Rep) => ok(reply, await contacts.createOpportunity(r.ctx, r.params.id, r.body), 201)
