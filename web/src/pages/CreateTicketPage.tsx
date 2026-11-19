import { getSites, getSummary, getTechnicians } from '@/api/dashboard'
import { createTicket } from '@/api/tickets'
import { PriorityBadge } from '@/components/PriorityBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import { CATEGORY_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Category, Priority } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]
const PRIORITIES: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const UNASSIGNED = 'none' // a Select item can't have an empty value, so "no technician" gets its own
const TITLE_MAX = 150
const DESCRIPTION_MAX = 2000

type Field = 'title' | 'category' | 'site'

/** Supervisor only (the router guards it): open a new ticket and, optionally, assign it straight away. */
export function CreateTicketPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [siteId, setSiteId] = useState('')
  const [technicianId, setTechnicianId] = useState(UNASSIGNED)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  // Once a field is fixed, its error goes away straight away instead of waiting for the next submit.
  const clearError = (field: Field) => setErrors(e => (e[field] ? { ...e, [field]: undefined } : e))

  // Dropdown data. People and sites rarely change, so keep them for 5 minutes.
  const sites = useQuery({ queryKey: ['sites'], queryFn: getSites, staleTime: 5 * 60_000 })
  const technicians = useQuery({ queryKey: ['technicians'], queryFn: getTechnicians, staleTime: 5 * 60_000 })
  // Optional extra: each technician's current load, to help pick someone who isn't swamped.
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: getSummary })
  const load = new Map(summary.data?.technicians.map(t => [t.id, t.activeTickets]))

  const mutation = useMutation({
    mutationFn: () =>
      createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category as Category,
        priority,
        siteId: Number(siteId),
        assignedToId: technicianId === UNASSIGNED ? undefined : Number(technicianId),
      }),
    onSuccess: ticket => {
      queryClient.setQueryData(['ticket', ticket.id], ticket) // the detail page opens instantly
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${ticket.ticketNo} created${ticket.assignedTo ? ` and assigned to ${ticket.assignedTo.name}` : ''}`)
      navigate(`/tickets/${ticket.id}`, { replace: true }) // replace: Back shouldn't return to a filled-in form
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mutation.isPending) return
    const found: Partial<Record<Field, string>> = {}
    if (!title.trim()) found.title = 'Give the ticket a short title.'
    if (!category) found.category = 'Choose a category.'
    if (!siteId) found.site = 'Choose the site.'
    setErrors(found)
    if (Object.keys(found).length === 0) mutation.mutate()
  }

  const busy = mutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="h-11 w-fit px-2 text-muted-foreground" onClick={() => navigate(-1)}>
        <ArrowLeft aria-hidden /> Back
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New ticket</h1>
        <p className="text-sm text-muted-foreground">Assign it now, or leave it open and assign it later.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <FormField id="title" label="Title" error={errors.title} counter={`${title.length}/${TITLE_MAX}`}>
          <Input
            id="title"
            className="h-11"
            maxLength={TITLE_MAX}
            placeholder="e.g. Fibre link down"
            value={title}
            disabled={busy}
            aria-invalid={!!errors.title}
            onChange={e => {
              setTitle(e.target.value)
              clearError('title')
            }}
          />
        </FormField>

        <FormField id="description" label="Description" optional counter={`${description.length}/${DESCRIPTION_MAX}`}>
          <Textarea
            id="description"
            rows={4}
            maxLength={DESCRIPTION_MAX}
            placeholder="What's wrong, since when, and anything the technician should know"
            value={description}
            disabled={busy}
            className="text-base md:text-sm"
            onChange={e => setDescription(e.target.value)}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="category" label="Category" error={errors.category}>
            <Select value={category} onValueChange={v => {
                setCategory(v as Category)
                clearError('category')
              }} disabled={busy}>
              <SelectTrigger id="category" className="w-full data-[size=default]:h-11" aria-invalid={!!errors.category}>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent position="popper">
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="h-10">
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField id="site" label="Site" error={errors.site ?? (sites.error ? errorMessage(sites.error) : undefined)}>
            <Select value={siteId} onValueChange={v => {
                setSiteId(v)
                clearError('site')
              }} disabled={busy || sites.isPending}>
              <SelectTrigger id="site" className="w-full data-[size=default]:h-11" aria-invalid={!!errors.site}>
                <SelectValue placeholder={sites.isPending ? 'Loading sites…' : 'Choose the site'} />
              </SelectTrigger>
              <SelectContent position="popper">
                {sites.data?.map(s => (
                  <SelectItem key={s.id} value={String(s.id)} className="h-10">
                    {s.name}, {s.city} <span className="text-muted-foreground">{s.code}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <fieldset className="flex flex-col gap-2" disabled={busy}>
          <legend className="mb-2 text-sm font-medium">Priority</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRIORITIES.map(p => (
              <label
                key={p}
                className={cn(
                  'flex h-11 cursor-pointer items-center justify-center rounded-lg border transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  priority === p ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
                )}
              >
                <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="sr-only" />
                <PriorityBadge priority={p} />
              </label>
            ))}
          </div>
        </fieldset>

        <FormField id="technician" label="Assign to" optional error={technicians.error ? errorMessage(technicians.error) : undefined}>
          <Select value={technicianId} onValueChange={setTechnicianId} disabled={busy || technicians.isPending}>
            <SelectTrigger id="technician" className="w-full data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={UNASSIGNED} className="h-10">
                Leave unassigned (Open)
              </SelectItem>
              {technicians.data?.map(t => (
                <SelectItem key={t.id} value={String(t.id)} className="h-10">
                  {t.name}
                  {load.has(t.id) && <span className="text-muted-foreground">{load.get(t.id)} active</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {mutation.error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage(mutation.error)}
          </p>
        )}

        <Button type="submit" className="h-12 text-base" disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          {busy ? 'Creating…' : 'Create ticket'}
        </Button>
      </form>
    </div>
  )
}

/** A label, the input itself, and an error line underneath, laid out the same way for every field. */
function FormField({
  id,
  label,
  optional,
  counter,
  error,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  counter?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label} {optional && <span className="text-muted-foreground">(optional)</span>}
        </Label>
        {counter && <span className="text-xs text-muted-foreground tabular-nums">{counter}</span>}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
