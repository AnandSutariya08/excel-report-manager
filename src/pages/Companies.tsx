import React, { useState } from 'react';
import { useData, Company } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Store, Trash2, Edit, Settings, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Companies: React.FC = () => {
  const { companies, addCompany, updateCompany, deleteCompany } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Company name is required',
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData);
        toast({ title: 'Company Updated', description: `${formData.name} has been updated successfully` });
      } else {
        await addCompany(formData);
        toast({ title: 'Company Created', description: `${formData.name} has been added successfully` });
      }

      setFormData({ name: '', description: '' });
      setEditingCompany(null);
      setIsOpen(false);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save company. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({ name: company.name, description: company.description });
    setIsOpen(true);
  };

  const handleDelete = (company: Company) => {
    deleteCompany(company.id);
    toast({ title: 'Company deleted', description: `${company.name} has been removed`, variant: 'destructive' });
  };

  const handleDialogClose = () => {
    setIsOpen(false);
    setEditingCompany(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground">Manage your companies and their platforms</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
            handleDialogClose();
          }
        }}>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Edit Company' : 'Create New Company'}</DialogTitle>
              <DialogDescription>
                {editingCompany ? 'Update company details' : 'Add a new company to manage platforms'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Trading Company"
                  className="bg-secondary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this company"
                  className="bg-secondary/50 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDialogClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingCompany ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingCompany ? 'Update' : 'Create'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50"
        />
      </div>

      {/* Companies Grid */}
      {filteredCompanies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company, idx) => (
            <Card 
              key={company.id} 
              className="bg-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up group"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Created {new Date(company.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(company)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Company?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {company.name} and all its platforms, orders, and data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDelete(company)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {company.description || 'No description'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="w-4 h-4" />
                    <span>{company.platforms.length} Platform{company.platforms.length !== 1 ? 's' : ''}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/company/${company.id}`)}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No companies found' : 'No Companies Yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'Create your first company to start managing platforms and tracking orders'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Company
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Companies;
