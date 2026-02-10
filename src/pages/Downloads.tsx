import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Building2,
  Store,
  Calendar,
  Filter,
  Database,
  FileDown,
  Loader2,
} from 'lucide-react';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { getMasterFilePath } from '@/lib/masterFileService';

const Downloads: React.FC = () => {
  const { companies, uploadedFiles, getPlatformById, getCompanyById } = useData();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  // Get all platforms
  const allPlatforms = useMemo(() => {
    return companies.flatMap(c => c.platforms);
  }, [companies]);

  // Get available platforms for selected company
  const availablePlatforms = useMemo(() => {
    if (selectedCompany === 'all') {
      return allPlatforms;
    }
    const company = companies.find(c => c.id === selectedCompany);
    return company?.platforms || [];
  }, [companies, selectedCompany, allPlatforms]);

  // Filter uploaded files
  const filteredUploadedFiles = useMemo(() => {
    return uploadedFiles.filter(file => {
      const matchesSearch = 
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.platformName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCompany = selectedCompany === 'all' || file.companyId === selectedCompany;
      const matchesPlatform = selectedPlatform === 'all' || file.platformId === selectedPlatform;

      return matchesSearch && matchesCompany && matchesPlatform;
    }).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [uploadedFiles, searchQuery, selectedCompany, selectedPlatform]);

  // Get unique master files (one per platform)
  const masterFiles = useMemo(() => {
    const masterFileMap = new Map<string, {
      companyId: string;
      platformId: string;
      companyName: string;
      platformName: string;
      masterFilePath: string;
    }>();

    companies.forEach(company => {
      company.platforms.forEach(platform => {
        const masterPath = getMasterFilePath(company.id, platform.id);
        const key = `${company.id}_${platform.id}`;
        
        if (!masterFileMap.has(key)) {
          masterFileMap.set(key, {
            companyId: company.id,
            platformId: platform.id,
            companyName: company.name,
            platformName: platform.name,
            masterFilePath: masterPath,
          });
        }
      });
    });

    return Array.from(masterFileMap.values()).filter(master => {
      const matchesCompany = selectedCompany === 'all' || master.companyId === selectedCompany;
      const matchesPlatform = selectedPlatform === 'all' || master.platformId === selectedPlatform;
      const matchesSearch = 
        master.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        master.platformName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCompany && matchesPlatform && matchesSearch;
    });
  }, [companies, selectedCompany, selectedPlatform, searchQuery]);

  const downloadFile = async (storagePath: string, fileName: string) => {
    const downloadKey = `${storagePath}_${fileName}`;
    
    if (downloadingFiles.has(downloadKey)) {
      return; // Already downloading
    }

    try {
      setDownloadingFiles(prev => new Set(prev).add(downloadKey));
      
      const fileRef = ref(storage, storagePath);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadURL;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Download Started',
        description: `Downloading ${fileName}...`,
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(downloadKey);
        return newSet;
      });
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'sales':
        return <FileSpreadsheet className="w-4 h-4 text-primary" />;
      case 'payment':
        return <FileText className="w-4 h-4 text-accent" />;
      case 'gst':
        return <FileText className="w-4 h-4 text-success" />;
      case 'refund':
        return <FileText className="w-4 h-4 text-warning" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getFileTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sales: 'bg-primary/20 text-primary border-primary/30',
      payment: 'bg-accent/20 text-accent border-accent/30',
      gst: 'bg-success/20 text-success border-success/30',
      refund: 'bg-warning/20 text-warning border-warning/30',
    };
    return (
      <Badge className={colors[type] || 'bg-secondary'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Downloads</h1>
          <p className="text-muted-foreground">Download uploaded files and master files from Firebase Storage</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files, companies, platforms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
            <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); setSelectedPlatform('all'); }}>
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
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <Store className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {availablePlatforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Master Files Section */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Master Files
          </CardTitle>
          <CardDescription>
            Consolidated master files (one per platform) containing all merged data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {masterFiles.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="data-table-header border-border/50">
                    <TableHead className="text-muted-foreground">Company</TableHead>
                    <TableHead className="text-muted-foreground">Platform</TableHead>
                    <TableHead className="text-muted-foreground">File Name</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterFiles.map((master, idx) => {
                    const downloadKey = `${master.masterFilePath}_master.xlsx`;
                    const isDownloading = downloadingFiles.has(downloadKey);
                    
                    return (
                      <TableRow key={idx} className="border-border/30 hover:bg-secondary/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{master.companyName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{master.platformName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-primary" />
                            <span className="text-sm font-mono">master.xlsx</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(master.masterFilePath, `master_${master.companyName}_${master.platformName}.xlsx`)}
                            disabled={isDownloading}
                            className="border-primary/30"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No master files found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files Section */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileDown className="w-5 h-5 text-accent" />
            Uploaded Files
          </CardTitle>
          <CardDescription>
            Original files uploaded by users (Sales, Payment, GST, Refund)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUploadedFiles.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="data-table-header border-border/50">
                    <TableHead className="text-muted-foreground">File</TableHead>
                    <TableHead className="text-muted-foreground">Company</TableHead>
                    <TableHead className="text-muted-foreground">Platform</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Upload Date</TableHead>
                    <TableHead className="text-muted-foreground">Records</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUploadedFiles.map((file) => {
                    const downloadKey = `${file.storagePath}_${file.fileName}`;
                    const isDownloading = downloadingFiles.has(downloadKey);
                    
                    return (
                      <TableRow key={file.id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileTypeIcon(file.fileType)}
                            <span className="text-sm font-medium truncate max-w-[200px]">{file.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{file.companyName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{file.platformName}</span>
                        </TableCell>
                        <TableCell>
                          {getFileTypeBadge(file.fileType)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(file.uploadDate).toLocaleDateString('en-IN')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{file.recordsCount}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file.storagePath, file.fileName)}
                            disabled={isDownloading}
                            className="border-primary/30"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center">
              <FileDown className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery || selectedCompany !== 'all' || selectedPlatform !== 'all'
                  ? 'No files match your filters'
                  : 'No uploaded files yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Downloads;

