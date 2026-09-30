import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuditLogs, AuditLogEntry } from '@/hooks/useAuditLogs';
import { useStaff } from '@/hooks/useStaff';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ShieldCheck, ChevronDown, ChevronUp, User, Clock, ArrowRight } from 'lucide-react';
import { formatINR } from '@/domain/money';

// --- Formatting Helpers ---

function formatEntityType(type: string): string {
  const map: Record<string, string> = {
    restaurantDailySale: 'Restaurant Daily Sale',
    banquetSale: 'Banquet Daily Sale',
    staff: 'Staff Member',
    attendance: 'Attendance Record',
    expense: 'Expense Record',
    booking: 'Room Booking',
    banquetBooking: 'Banquet Event Booking',
    payment: 'Payment Record',
    room: 'Room',
    roomType: 'Room Type',
    payrollPayment: 'Payroll Payment',
  };
  return map[type] || type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

function formatEntityId(id: string): string {
  // Extract date if it exists at the end (e.g. hotel-001_2026-09-29)
  const dateMatch = id.match(/_(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) {
    return `Date: ${dateMatch[1]}`;
  }
  // Otherwise, if it's a long random string, just show a truncated ID
  if (id.length > 15 && !id.includes('-')) {
    return `ID: ${id.slice(0, 8)}...`;
  }
  return `ID: ${id}`;
}

function formatFieldName(field: string): string {
  if (field === 'deletedAt') return 'Status';
  const result = field.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined) return 'None';
  
  if (field === 'deletedAt') {
    return value ? `Deleted on ${new Date(value).toLocaleString()}` : 'Active';
  }

  // Format monetary values
  if (field.toLowerCase().includes('amount') || field.toLowerCase().includes('price') || field.toLowerCase().includes('salary')) {
    if (typeof value === 'number') {
      return formatINR(value);
    }
  }

  // Format timestamps
  if (field.toLowerCase().includes('date') || field === 'createdAt' || field === 'updatedAt' || field === 'checkIn' || field === 'checkOut') {
    if (typeof value === 'number') {
      return new Date(value).toLocaleString();
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

// --- Components ---

function actionColor(action: string) {
  if (action === 'delete') return 'bg-red-50 text-red-600 border-red-200';
  if (action === 'edit') return 'bg-amber-50 text-amber-600 border-amber-200';
  return 'bg-emerald-50 text-emerald-600 border-emerald-200';
}

function ChangesDetail({ entry }: { entry: AuditLogEntry }) {
  if (!entry.changes) return null;

  if (Array.isArray(entry.changes)) {
    return (
      <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Changes Made</h4>
        <ul className="space-y-3">
          {entry.changes.map((c, i) => (
            <li key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
              <span className="font-semibold text-gray-700 min-w-[120px]">{formatFieldName(c.field)}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white px-2 py-1 rounded text-gray-500 border border-gray-200 line-through decoration-red-400/50">
                  {formatValue(c.field, c.oldValue)}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="bg-white px-2 py-1 rounded text-gray-900 border border-emerald-200 font-medium bg-emerald-50/30">
                  {formatValue(c.field, c.newValue)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <pre className="text-xs bg-gray-50 p-4 rounded-xl mt-4 overflow-x-auto border border-gray-100 text-gray-700">
      {JSON.stringify(entry.changes, null, 2)}
    </pre>
  );
}

export function AuditLogPage() {
  const { data: logs = [], isLoading } = useAuditLogs();
  const { data: staff = [] } = useStaff(); // Fetch staff to map userIds to names
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper to resolve the user's name
  const getUserName = (userId: string) => {
    const s = staff.find(member => member.userId === userId || member.id === userId);
    return s ? s.name : userId; // Fallback to raw ID if not found
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <PageHeader
        icon={ShieldCheck}
        title="Audit Log"
        description="A clear history of edits and deletes made across the system."
      />

      {isLoading ? (
        <LoadingState label="Loading audit log..." />
      ) : logs.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No audited changes yet" description="System edits and deletes will appear here." />
      ) : (
        <div className="space-y-4">
          {paginatedLogs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const userName = getUserName(entry.userId);

            return (
              <Card 
                key={entry.id} 
                className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-2 ring-purple-500/20 shadow-md border-purple-200' : 'hover:border-purple-200 hover:shadow-sm'}`}
              >
                <CardHeader 
                  className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <Badge variant="outline" className={`${actionColor(entry.action)} px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest text-[10px]`}>
                          {entry.action}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                          {formatEntityType(entry.entityType)}
                          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            {formatEntityId(entry.entityId)}
                          </span>
                        </CardTitle>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span className="font-medium text-gray-700">{userName}</span>
                            {entry.userRole && <span className="text-gray-400 text-xs">({entry.userRole})</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="sm" className="h-8 text-gray-500 rounded-lg">
                        {isExpanded ? (
                          <>Hide details <ChevronUp className="w-4 h-4 ml-1" /></>
                        ) : (
                          <>View changes <ChevronDown className="w-4 h-4 ml-1" /></>
                        )}
                      </Button>
                    </div>

                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4 sm:px-16 animate-in slide-in-from-top-2 duration-200">
                    <ChangesDetail entry={entry} />
                  </CardContent>
                )}
              </Card>
            );
          })}
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, logs.length)}</span> of <span className="font-medium">{logs.length}</span> audit logs
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm font-medium text-gray-700 px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg shadow-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
