import { getTechnicians } from '@/api/dashboard'
import { assignTicket } from '@/api/tickets'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errorMessage } from '@/lib/errors'
import type { TicketDetail } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, UserRoundPen } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

/** Supervisor only: pick a technician for this ticket. The ticket goes (back) to Assigned. */
export function AssignDialog({ ticket }: { ticket: TicketDetail }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [technicianId, setTechnicianId] = useState('')
  const current = ticket.assignedTo

  const technicians = useQuery({
    queryKey: ['technicians'],
    queryFn: getTechnicians,
    enabled: open, // only load the list when the dialog is opened
    staleTime: 5 * 60_000, // people rarely change; no need to refetch every time
  })

  const mutation = useMutation({
    mutationFn: () => assignTicket(ticket.id, Number(technicianId)),
    onSuccess: updated => {
      // The server sends back the whole updated ticket, so show it straight away without another request.
      queryClient.setQueryData(['ticket', ticket.id], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${ticket.ticketNo} assigned to ${updated.assignedTo?.name}`)
      setOpen(false)
    },
  })

  function handleOpenChange(next: boolean) {
    if (mutation.isPending) return // don't close halfway through saving
    setOpen(next)
    if (next) {
      setTechnicianId('')
      mutation.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <UserRoundPen aria-hidden /> {current ? 'Reassign' : 'Assign'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{current ? 'Reassign ticket' : 'Assign ticket'}</DialogTitle>
          <DialogDescription>
            {current
              ? `${ticket.ticketNo} is with ${current.name}. The new technician will see it as Assigned.`
              : `Pick a technician for ${ticket.ticketNo}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="assign-technician">Technician</Label>
          <Select value={technicianId} onValueChange={setTechnicianId} disabled={technicians.isPending || mutation.isPending}>
            <SelectTrigger id="assign-technician" className="h-11 w-full data-[size=default]:h-11">
              <SelectValue placeholder={technicians.isPending ? 'Loading…' : 'Choose a technician'} />
            </SelectTrigger>
            <SelectContent position="popper">
              {technicians.data?.map(t => (
                <SelectItem key={t.id} value={String(t.id)} disabled={t.id === current?.id} className="h-10">
                  {t.name}
                  {t.id === current?.id && ' (current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {technicians.error && <p className="text-sm text-destructive">{errorMessage(technicians.error)}</p>}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(mutation.error)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button className="h-11" onClick={() => mutation.mutate()} disabled={!technicianId || mutation.isPending}>
            {mutation.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
            {current ? 'Reassign' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
