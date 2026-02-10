import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  FileSpreadsheet,
  Download,
  Trash2,
  Calendar,
  Building2,
  Store,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';

const Files: React.FC = () => {
  const { uploadedFiles, deleteUploadedFile, companies, orders } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filter files
  const filteredFiles = useMemo(() => {
    return uploadedFiles.filter(file => {
      const matchesSearch = 
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.platformName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCompany = selectedCompany === 'all' || file.companyId === selectedCompany;
      const matchesType = selectedFileType === 'all' || file.fileType === selectedFileType;
      
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && new Date(file.uploadDate) >= new Date(startDate);
      }
      if (endDate) {
        matchesDate = matchesDate && new Date(file.uploadDate) <= new Date(endDate + 'T23:59:59');
      }

      return matchesSearch && matchesCompany && matchesType && matchesDate;
    }).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [uploadedFiles, searchQuery, selectedCompany, selectedFileType, startDate, endDate]);

  // Stats
  const stats = useMemo(() => {
    const totalFiles = filteredFiles.length;
    const totalRecords = filteredFiles.reduce((sum, f) => sum + f.recordsCount, 0);
    const successFiles = filteredFiles.filter(f => f.status === 'success').length;
    const errorFiles = filteredFiles.filter(f => f.status === 'failed').length;
    return { totalFiles, totalRecords, successFiles, errorFiles };
  }, [filteredFiles]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
      case 'partial':
        return <Badge className="bg-warning/20 text-warning border-warning/30"><AlertTriangle className="w-3 h-3 mr-1" /> Partial</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFileTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sales: 'bg-primary/20 text-primary border-primary/30',
      payment: 'bg-accent/20 text-accent border-accent/30',
      gst: 'bg-success/20 text-success border-success/30',
      refund: 'bg-warning/20 text-warning border-warning/30',
    };
    return <Badge variant="outline" className={colors[type] || ''}>{type.toUpperCase()}</Badge>;
  };

  const handleDelete = async (id: string) => {
    await deleteUploadedFile(id);
  };

  const exportToCSV = () => {
    const headers = ['File Name', 'Type', 'Company', 'Platform', 'Records', 'Status', 'Errors', 'Upload Date', 'Uploaded By'];
    const rows = filteredFiles.map(f => [
      f.fileName,
      f.fileType,
      f.companyName,
      f.platformName,
      f.recordsCount,
      f.status,
      f.errors,
      format(new Date(f.uploadDate), 'yyyy-MM-dd HH:mm'),
      f.uploadedBy
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uploaded-files-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCompany('all');
    setSelectedFileType('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Uploaded Files</h1>
          <p className="text-muted-foreground">View and manage all uploaded Excel files</p>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={filteredFiles.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export List
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalFiles}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalRecords.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.successFiles}</p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.errorFiles}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedFileType} onValueChange={setSelectedFileType}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="gst">GST</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="From Date"
              className="bg-secondary/50 border-border/50"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="To Date"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          {(searchQuery || selectedCompany !== 'all' || selectedFileType !== 'all' || startDate || endDate) && (
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Files ({filteredFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow className="data-table-header border-border/50">
                    <TableHead className="text-muted-foreground">File Name</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Company</TableHead>
                    <TableHead className="text-muted-foreground">Platform</TableHead>
                    <TableHead className="text-muted-foreground text-center">Records</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Upload Date</TableHead>
                    <TableHead className="text-muted-foreground text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.length > 0 ? filteredFiles.map((file, idx) => (
                    <TableRow 
                      key={file.id} 
                      className="border-border/30 hover:bg-secondary/30 animate-fade-in"
                      style={{ animationDelay: `${idx * 0.02}s` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground truncate max-w-[200px]">{file.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getFileTypeBadge(file.fileType)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{file.companyName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{file.platformName}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">{file.recordsCount.toLocaleString()}</span>
                        {file.errors > 0 && (
                          <span className="text-destructive text-xs ml-1">({file.errors} errors)</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(file.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(file.uploadDate), 'dd MMM yyyy, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete File Record?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will only delete the file record from the list. The processed orders will remain in the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(file.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FileSpreadsheet className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No files uploaded yet</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Files;
