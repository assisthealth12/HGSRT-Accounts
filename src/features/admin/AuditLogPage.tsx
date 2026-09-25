import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuditLogs, AuditLogEntry } from '@/hooks/useAuditLogs';

function actionColor(action: string) {
  if (action === 'delete') return 'text-destructive border-destructive';
  if (action === 'edit') return 'text-warning border-warning';
  return 'text-success border-success';
}

function ChangesDetail({ entry }: { entry: AuditLogEntry }) {
  if (!entry.changes) return null;

  if (Array.isArray(entry.changes)) {
    return (
      <ul className="text-sm space-y-1 mt-2">
        {entry.changes.map((c, i) => (
          <li key={i}>
            <span className="font-medium">{c.field}</span>: {JSON.stringify(c.oldValue)} → {JSON.stringify(c.newValue)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <pre className="text-xs bg-muted/40 p-3 rounded mt-2 overflow-x-auto">
      {JSON.stringify(entry.changes, null, 2)}
    </pre>
  );
}

export function AuditLogPage() {
  const { data: logs = [], isLoading } = useAuditLogs();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">
          Every edit and delete made by Manager accounts, most recent first.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading audit log...</div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No audited changes yet.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={actionColor(entry.action)}>
                    {entry.action.toUpperCase()}
                  </Badge>
                  <CardTitle className="text-base font-medium">
                    {entry.entityType} · {entry.entityId}
                  </CardTitle>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  By user {entry.userId} {entry.userRole ? `(${entry.userRole})` : ''}
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="px-0"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  {expandedId === entry.id ? 'Hide details' : 'Show details'}
                </Button>
                {expandedId === entry.id && <ChangesDetail entry={entry} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
